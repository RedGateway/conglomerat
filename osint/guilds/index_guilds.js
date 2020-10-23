/**
 * Mongo Models
 */
require('../../db/connection')
const guild_db = require('../../db/models/guilds_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const getGuild = require('./get_guild');

/**
 * Indexing every guild in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

((
  queryFind = {},
  queryKeys = { tags: `OSINT-indexGuilds` },
  bulkSize = 4,
) => {
  console.time(`OSINT-indexGuilds`);
  const { token } = keys_db.findOne(queryKeys).exec();
  guild_db
    .find(queryFind)
    .lean()
    .cursor()
    .eachAsync(
      async ({ name, realm }, i) => {
        await getGuild({
          name: name,
          realm: realm,
          updatedBy: `OSINT-indexGuilds`
        }, token, false, i);
      },
      { parallel: bulkSize },
    ).then(r => r).catch(error => console.error(error));
  console.timeEnd(`OSINT-indexGuilds`);
})();
