const express = require('express');
const router = express.Router();

/**
 * Model importing
 */

const realms_db = require('../../db/models/realms_db');

/**
 * Modules
 */

const clusterGoldData = require('../../dma/valuations/cluster/cluster_chart_gold.js');
const goldsData = require('../../dma/golds/gold_quotes.js');

router.get('/:realmSlug', async function (req, res) {
  try {
    const { realmSlug } = req.params;
    let response = {};
    let contracts = [];
    let realm = await realms_db
      .findOne({ $text: { $search: realmSlug } })
      .sort({ score: { $meta: 'textScore' } })
      .lean();
    if (realm) {
      await Promise.allSettled([
        clusterGoldData(realm.connected_realm_id).then(chart =>
          Object.assign(response, { chart: chart }),
        ),
        goldsData(realm.connected_realm_id).then(quotes =>
          Object.assign(response, { quotes: quotes }),
        ),
      ]);
      Object.assign(response, {
        realm: realm,
        contracts: contracts,
      });
      await res.status(200).json(response);
    } else {
      await res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    await res.status(500).json(e);
  }
});

module.exports = router;
