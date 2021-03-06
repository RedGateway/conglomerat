import { Injectable, Logger } from '@nestjs/common';
import { range } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { Character, Guild, Key, Realm, RealmPopulation } from '@app/mongo';
import { Model } from 'mongoose';
import Xray from 'x-ray';
import {
  CHARACTER_CLASS, COVENANTS,
  FACTION,
  GLOBAL_KEY,
  MAX_LEVEL,
  PopulationRealmInterface,
  realmsQueue,
  toKey,
} from '@app/core';
import BlizzAPI from 'blizzapi';
import { BullQueueInject } from '@anchan828/nest-bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RealmsService {
  private readonly logger = new Logger(
    RealmsService.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Key.name)
    private readonly KeyModel: Model<Key>,
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
    @InjectModel(RealmPopulation.name)
    private readonly RealmPopulationModel: Model<RealmPopulation>,
    @InjectModel(Guild.name)
    private readonly GuildModel: Model<Guild>,
    @InjectModel(Character.name)
    private readonly CharacterModel: Model<Character>,
    @BullQueueInject(realmsQueue.name)
    private readonly queue: Queue,
  ) {
    this.indexRealms(GLOBAL_KEY);
    this.getRealmsWarcraftLogsID(247, 517);
    this.indexRealmPopulation();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async indexRealms(clearance: string = GLOBAL_KEY): Promise<void> {
    try {

      const key = await this.KeyModel.findOne({ tags: clearance });
      if (!key || !key.token) {
        this.logger.error(`indexRealms: clearance: ${clearance} key not found`);
        return
      }

      await this.queue.drain(true)

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: key._id,
        clientSecret: key.secret,
        accessToken: key.token
      });

      const { realms: realmList } = await this.BNet.query(`/data/wow/realm/index`, {
        timeout: 10000,
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'dynamic-eu' }
      });

      for (const { id, name, slug } of realmList) {
        this.logger.log(`${id}:${name}`);
        await this.queue.add(
          slug,
          {
            _id: id,
            name: name,
            slug: slug,
            region: 'eu',
            clientId: key._id,
            clientSecret: key.secret,
            accessToken: key.token
          }, {
            jobId: slug
          }
        );
      }
    } catch (e) {
      this.logger.error(`indexRealms: ${e}`)
    }
  }

  /**
   * Index every realm for WCL id, US:0,246 EU:247,517 (RU: 492) Korea: 517
   * @param start
   * @param end
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  private async getRealmsWarcraftLogsID(start: number = 1, end: number = 517): Promise<void> {
    const x = Xray();
    try {
      if (start < 1) start = 1;
      const wcl_ids: number[] = range(start, end + 1, 1);
      for (const wcl_id of wcl_ids) {
        const realm_name: string = await x(`https://www.warcraftlogs.com/server/id/${wcl_id}`, '.server-name').then(res => res);
        if (realm_name) {
          const realm = await this.RealmModel.findOneAndUpdate({ $or: [{ name: realm_name }, { name_locale: realm_name } ]}, { wcl_id: wcl_id });
          this.logger.debug(`${wcl_id}:${realm_name}, ${realm}`);
        }
      }
    } catch (e) {
      this.logger.error(`getRealmsWarcraftLogsID: ${e}`)
    }
  }

  private async indexRealmPopulation(): Promise<void> {
    try {
      await this.RealmModel
        .find()
        .cursor()
        .eachAsync(async (realm: Realm) => {
          await this.population(realm);
        })
    } catch (e) {
      this.logger.error(`indexRealmPopulation: ${e}`)
    }
  }

  private async population(realm: Realm): Promise<void> {
    try {
      this.logger.log(`population: ${realm._id} started`)
      const population: Partial<PopulationRealmInterface> = {
        realm_id: realm._id,
        characters_classes: {
          death_knight: 0,
          demon_hunter: 0,
          druid: 0,
          hunter: 0,
          mage: 0,
          monk: 0,
          paladin: 0,
          priest: 0,
          rogue: 0,
          shaman: 0,
          warlock: 0,
          warrior: 0
        },
        characters_covenants: {
          kyrian: 0,
          venthyr: 0,
          night_fae: 0,
          necrolord: 0
        }
      };

      /**
       * Characters Statistics
       */
      population.characters_total = await this.CharacterModel.countDocuments({ realm: realm.slug });
      population.characters_active = await this.CharacterModel.countDocuments({ realm: realm.slug, status_code: 200 });
      population.characters_active_alliance = await this.CharacterModel.countDocuments({ realm: realm.slug, status_code: 200, faction: FACTION.A });
      population.characters_active_horde = await this.CharacterModel.countDocuments({ realm: realm.slug, status_code: 200, faction: FACTION.H });
      population.characters_active_max_level = await this.CharacterModel.countDocuments({ realm: realm.slug, status_code: 200, level: MAX_LEVEL });
      population.characters_guild_members = await this.CharacterModel.countDocuments({ realm: realm.slug, guild: { "$ne": undefined } });
      population.characters_guildless = await this.CharacterModel.countDocuments({ realm: realm.slug, guild: undefined })
      const players_unique = await this.CharacterModel.find({ realm: realm.slug }).distinct('personality');
      population.players_unique = players_unique.length;
      const players_active_unique = await this.CharacterModel.find({ realm: realm.slug, status_code: 200 }).distinct('personality');
      population.players_active_unique = players_active_unique.length;
      /**
       * Guild number
       * and their faction balance
       * TODO make sure that guild data always actual
       */
      population.guilds_total = await this.GuildModel.countDocuments({ realm: realm.slug });
      population.guilds_alliance = await this.GuildModel.countDocuments({ realm: realm.slug, faction: FACTION.A });
      population.guilds_horde = await this.GuildModel.countDocuments({ realm: realm.slug, faction: FACTION.H });
      /**
       * Class popularity among
       * every active character
       */
      for (const character_class of CHARACTER_CLASS) {
        const key: string = toKey(character_class);
        population.characters_classes[key] = await this.CharacterModel.countDocuments({ realm: realm.slug, statusCode: 200, character_class: character_class });
      }
      /**
       * Count covenant stats
       * for every active character
       */
      for (const covenant of COVENANTS) {
        const key: string = toKey(covenant);
        population.characters_covenants[key] = await this.CharacterModel.countDocuments({ 'realm.slug': realm.slug, statusCode: 200, 'chosen_covenant': covenant });
      }

      await this.RealmPopulationModel.create(population);
      this.logger.log(`population: ${realm.name} finished`)
    } catch (e) {
      this.logger.error(`population: ${realm._id}:${e}`)
    }
  }
}
