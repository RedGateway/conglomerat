/**
 * Mongo Models
 */
require('../../db/connection')
const characters_db = require('../../db/models/characters_db');
const keys_db = require('../../db/models/keys_db');

/**
 * Modules
 */

const schedule = require('node-schedule');
const getCharacter = require('./get_character');

/***
 * Indexing every character in bulks from OSINT-DB for updated information
 * @param queryFind - index guild bu this argument
 * @param queryKeys - token access
 * @param bulkSize - block data per certain number
 * @returns {Promise<void>}
 */

schedule.scheduleJob('40 08 20/7 * *', async (
  t,
  queryKeys = { tags: `OSINT-indexCharacters` },
  bulkSize = 1,
) => {
  try {
    console.time(`OSINT-indexCharacters`);
    let { token } = await keys_db.findOne(queryKeys);
    await characters_db
      .find()
      .sort({'updatedAt': 1})
      .cursor({ batchSize: bulkSize })
      .eachAsync(({ name, realm }, i) => {
          getCharacter({ name: name, realm: realm, updatedBy: `OSINT-indexCharacters` }, token, false, false, i);
        },
        { parallel: bulkSize },
      );
  } catch (error) {
    console.error(error);
  } finally {
    console.timeEnd(`OSINT-indexCharacters`);
  }
});