const express = require('express');
const router = express.Router();

/**
 * Modules
 */
const itemRealmQuery = require("../../api/middleware")
const clusterChartData = require("../../../dma/getClusterChartData.js");
const auctionsData = require("../../../dma/auctions/auctionsData.js");
const goldsData = require("../../../dma/golds/goldsData.js");

router.get('/:itemQuery@:realmQuery', async function(req, res) {
    try {
        let response = {};

        const { itemQuery, realmQuery } = req.params;

        let [item, realm] = await itemRealmQuery(itemQuery, realmQuery);

        if (item && realm) {
            /**
             * @type {Promise<{Object}>[]}
             */
            let arrayPromises = [
                clusterChartData(item._id, realm.connected_realm_id).then(chart => Object.assign(response, { chart: chart }))
            ];
            if (item._id === 1) {
                arrayPromises.push(goldsData(realm.connected_realm_id).then(quotes => Object.assign(response, { quotes: quotes })))
            } else if (item._id === 122270 || item._id === 122284) {
                arrayPromises.length = 0;
                const wowtoken_db = require("../../../db/wowtoken_db");
                arrayPromises.push(wowtoken_db.findOne({ region: 'eu' }).sort({ _id: -1 }).lean().then(wowtoken => Object.assign(response, { wowtoken: wowtoken })))
            } else {
                arrayPromises.push(auctionsData(item._id, realm.connected_realm_id).then(quotes => Object.assign(response, { quotes: quotes })))
            }
            Object.assign(response, {item: item})
            Object.assign(response, {realm: realm})
            await Promise.allSettled(arrayPromises)
            await res.status(200).json(response);
        } else {
            await res.status(404).json({error: "Not found"});
        }
    } catch (e) {
        await res.status(500).json(e);
    }
});

module.exports = router;