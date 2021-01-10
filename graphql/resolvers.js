const characters_db = require('../db/models/characters_db');
const guilds_db = require('../db/models/guilds_db');
const realms_db = require('../db/models/realms_db');
const osint_logs_db = require('../db/models/osint_logs_db');
const keys_db = require('../db/models/keys_db');
const wowtoken_db = require('../db/models/wowtoken_db');
const messages_db = require('../db/models/messages_db')
const items_db = require('../db/models/items_db');

const getCharacter = require('../osint/characters/getCharacter');
const getGuild = require('../osint/guilds/getGuild')
const queryItemAndRealm = require('./handlers/item_realms');
const itemExtended = require('./handlers/item_extended')

const root = {
  character: async ({ id }) => {
    if (!id.includes('@')) return
    const [ nameSlug, realmSlug ] = id.toLowerCase().split('@');
    const realm = await realms_db
      .findOne(
        { $text: { $search: realmSlug } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) return

    const character = await characters_db.findById(`${nameSlug}@${realm.slug}`).lean();
    if (!character || (new Date().getTime() - (24 * 60 * 60 * 1000) > character.updatedAt.getTime())) {
      const { token } = await keys_db.findOne({ tags: `conglomerat` });
      await getCharacter({
        name: nameSlug,
        realm: { slug: realm.slug },
        createdBy: `OSINT-userInput`,
        updatedBy: `OSINT-userInput`,
        token: token,
        guildRank: true,
        createOnlyUnique: false,
        forceUpdate: true
      });
      const [char , logs] = await Promise.all([
        await characters_db.findById(`${nameSlug}@${realm.slug}`).lean(),
        await osint_logs_db.find({ root_id: character._id }).sort({ createdBy: -1 }).limit(1000).lean()
      ])
      return { ...char, ...{ logs: logs || [] }}
    }
    character.logs = await osint_logs_db.find({ root_id: character._id }).sort({ createdBy: -1 }).limit(1000)
    return character
  },
  guild: async ({ id }) => {
    if (!id.includes('@')) return
    const [ name, realmSlug ] = id.toLowerCase().split('@');
    const nameSlug = name.replace(/\s+/g, '-').replace(/'+/g, '')
    const realm = await realms_db
      .findOne(
        { $text: { $search: realmSlug } },
        { score: { $meta: 'textScore' }, populations: 0 },
      )
      .sort({ score: { $meta: 'textScore' } })
      .lean()
    if (!realm) return
    const guild = await guilds_db.findById(`${nameSlug}@${realm.slug}`).lean();
    if (!guild) {
      const { token } = await keys_db.findOne({ tags: `conglomerat` });
      await getGuild({ name: nameSlug, realm: realm, createdBy: 'OSINT-userInput', updatedBy: 'OSINT-userInput', token: token, createOnlyUnique: true })
      const guild_updated = await guilds_db.findById(`${nameSlug}@${realm.slug}`).lean();
      guild_updated.members = await characters_db.find({ _id: { $in: guild_updated.members.map(({_id}) => _id)} }, { professions: 0, pets: 0, mounts: 0, isWatched: 0, statusCode: 0, createdBy: 0, updatedBy: 0 }).lean();
      return guild_updated
    }
    //TODO promise.all thread
    guild.members = await characters_db.find({ _id: { '$in': guild.members.map(({_id}) => _id)} }, { professions: 0, pets: 0, mounts: 0, isWatched: 0, statusCode: 0, createdBy: 0, updatedBy: 0 }).lean();
    guild.logs = await osint_logs_db.find({ type: 'guild', root_id: guild._id }).lean()
    return guild
  },
  hash: async ({ query }) => {
    if (!query.includes('@')) return
    const [ type, hash ] = query.toLowerCase().split("@")
    return characters_db.find({ [`hash_${type}`]: hash }).limit(100).lean();
  },
  wowtoken: async ({ region }) => {
    return wowtoken_db
      .findOne({ region: region })
      .sort({ _id: -1 })
      .lean();
  },
  realms: async ({ name, limit }) => {
    return realms_db
      .find(
        { $text: { $search: name } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit || 0)
      .lean();
  },
  item: async ({ id, extended }) => {
    if (!id || !id.includes('@')) return
    const [ itemQuery, realmQuery ] = id.split('@');
    const [ item, realms ] = await queryItemAndRealm(itemQuery, realmQuery);
    if (!item || !realms) return

    /** WoW Token */
    if (item._id === 122284 || item._id === 122270) {
      await wowtoken_db
        .find({ region: 'eu' })
        .limit(200)
        .sort({ _id: -1 })
        .lean()
        .then(wowtoken => Object.assign(item, { wowtoken: wowtoken }))
    }

    /** Add realms */
    item.realms = [ ...realms];
    const connected_realms_id = [...new Set(realms.map(({ connected_realm_id }) => connected_realm_id))]
    const xrs = connected_realms_id.length > 1

    const { valuations, chart, quotes, feed } = await itemExtended(item, connected_realms_id, extended)

    if (valuations && valuations.length) item.valuations = valuations

    if (extended) {
      item.chart = chart
      if (quotes && quotes.length) item.quotes = quotes
      if (feed && feed.length) item.feed = feed
    }
    item.xrs = xrs

    return item
  },
  createMessage: async ({ input }) => {
    return messages_db.create(input);
  },
  items: async ({ id }) => {
    if (!id || !id.includes('@')) return
    const [ professionQuery, realmQuery ] = id.split('@');
    if (!professionQuery.includes(':') || !realmQuery) return
    const [ expansion, profession ] = professionQuery.split(':');
    return items_db.aggregate([
      {
        $match: {
          tags: { $all: [ expansion , profession ] }
        },
      },
      {
        $limit: 250
      },
      {
        $lookup: {
          from: "realms",
          pipeline: [
            {
              $match: { $text: { $search: realmQuery.toString().replace(';', ' ') } }
            },
            {
              $group: {
                _id: "$connected_realm_id",
                realms: { $first: "$$ROOT" },
              }
            },
            { $replaceRoot: { newRoot: "$realms" } },
            { $project: { populations: 0 } }
          ],
          as: "realms"
        }
      },
      {
        $lookup: {
          from: "valuations",
          let: { item_id: '$item_valuation', connected_realms: '$realms._id', valuations_timestamp: '$realms.valuations' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$item_id", "$$item_id"] },
                    { $ne: ["$type", 'VENDOR'] },
                    { $in: ["$connected_realm_id", "$$connected_realms"] },
                    { $in: ["$last_modified", "$$valuations_timestamp"] }
                  ]
                }
              }
            }
          ],
          as: "valuations"
        }
      }
    ]);
  }
}

module.exports = root;
