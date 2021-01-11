/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const realms_db = require('../../db/models/realms_db');
const keys_db = require('../../db/models/keys_db');

/**
 * getGuild indexing
 */

const getGuild = require('./getGuild');

/**
 * Modules
 */

const schedule = require('node-schedule');

/**
 * This function takes every unique guild name from OSINT-DB (characters) and
 * compares it with current OSINT-DB (guilds), adding new names to DB
 * @param queryFind {string}
 * @param queryKeys {string}
 * @returns {Promise<void>}
 */

const indexGuildNames = async (queryFind = 'Europe', queryKeys = `OSINT-indexGuilds`) => {
  try {
    console.time(`OSINT-fromCharacters`);
    await realms_db
      .findOne(
        { $text: { $search: queryFind } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
      .cursor()
      .addCursorFlag('noCursorTimeout', true)
      .eachAsync(async (realm, iterations) => {
        if (!realm || !('slug' in realm)) return
        const { token } = await keys_db.findOne({ tags: queryKeys });
        const guild_slugs = await characters_db.distinct('guild.slug', { 'realm.slug': realm.slug });
        for (const guild_slug of guild_slugs) {
          await getGuild({
            name: guild_slug,
            realm: realm,
            updatedBy: `OSINT-fromCharacters`,
            iterations: iterations,
            token: token,
            createOnlyUnique: true
          });
        }
      },
      { parallel: 1 },
    );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-fromCharacters`);
    process.exit(0)
  }
}

schedule.scheduleJob('30 4 * * *', () => {
  indexGuildNames('Europe', 'OSINT-indexGuilds').then(r => r)
})