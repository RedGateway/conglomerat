const items_db = require("../../db/items_db");
const getPricing = require("./getPricing");

/***
 * TODO evaluate all?
 *
 *
 */

async function indexValuation () {
    try {
        console.time(indexValuation.name);
        //TODO cursor
        let items = await items_db.find({ticker: "ALCH.CAULDRON"});
        for (let item of items) {
            let x = await getPricing(item, 1602, true);
            console.log(x);
        }
        console.timeEnd(indexValuation.name);
    } catch (err) {
        console.log(err);
    }
}

indexValuation();