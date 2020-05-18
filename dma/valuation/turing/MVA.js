/***
 * TODO RECURSIVE CONTROL
 * @param method
 * @param connected_realm_id
 * @param lastModified
 * @param item_depth
 * @param method_depth
 * @param single_name
 * @returns {Promise<{queue_quantity: number, reagent_items: [], premium_items: [], nominal_value: number, _id: string, queue_cost: number}>}
 */

async function methodValuationAdjustment (
        method = {},
        connected_realm_id = 1602,
        lastModified,
        item_depth = 0,
        method_depth = 0,
        single_name = false
    ) {
    const itemValuationAdjustment = require('./IVA');
    try {
        /**
         * Asset Class hierarchy map
         * @type {Map<string, number>}
         */
        const assetClassMap = new Map([
            ['VENDOR,REAGENT,ITEM', 0],
            ['CONST,REAGENT,ITEM', 1],
            ['REAGENT,MARKET,ITEM', 2],
            ['REAGENT,MARKET,DERIVATIVE', 3],
            ['CAP,MARKET,DERIVATIVE', 4],
            ['CAP,PREMIUM,DERIVATIVE', 5],
            ['PREMIUM,REAGENT,DERIVATIVE', 6],
            ['PREMIUM,MARKET,ITEM', 7],
            ['PREMIUM,REAGENT,ITEM', 8],
        ]);
        /**
         * Sort reagent_items according to map
         */
        method.reagent_items.sort((a, b) => assetClassMap.get(a.v_class) - assetClassMap.get(b.v_class));
        /**
         * Init production cost and premium
         */
        let queue_cost = 0;
        let premium_items = [];
        let reagent_items = [];
        for (let reagent_item of method.reagent_items) {
            /**
             * Check Reagent.value, if there is not add to cost 0 but premium
             * premium += (Price market (if exist) - quene_cost)
             * */
            if (reagent_item.v_class.some(v_class => v_class === 'PREMIUM')) {
                /**
                 * if iva has value then for premium
                 */
                if (single_name === true) {
                    Object.assign(reagent_item, {
                        price: 0,
                        value: 0
                    });
                } else {
                    let iva = await itemValuationAdjustment(reagent_item, connected_realm_id, lastModified, item_depth+1, method_depth+1);
                    if ("reagent" in iva) {
                        if ("value" in iva.reagent) {
                            Object.assign(reagent_item, {
                                price: iva.reagent.value,
                                value: parseFloat((iva.reagent.value * reagent_item.quantity).toFixed(2))
                            });
                        } else {
                            /** failsafe */
                            if (iva.reagent.premium.length > 0) {
                                const {value} = iva.reagent.premium.reduce((p, c) => p.wi > c.wi ? p : c);
                                Object.assign(reagent_item, {
                                    price: value,
                                    value: parseFloat((value * reagent_item.quantity).toFixed(2))
                                });
                            } else {
                                /** failsafe */
                                Object.assign(reagent_item, {
                                    price: 0,
                                    value: 0
                                });
                            }
                        }
                    } else {
                        /** failsafe */
                        Object.assign(reagent_item, {
                            price: 0,
                            value: 0
                        });
                    }
                }
                premium_items.push(reagent_item);
                reagent_items.push(reagent_item);
            } else {
                /**
                 * if method._id || method.item_id allow cap =>
                 * pass to IVA as allow cap as reagent {define reagent there}
                 *
                 * IDEA item_id premium allow cap?
                 */
                let allowCap = false;
                if (method.item_id === 152668) {
                    allowCap = true;
                }
                let iva = await itemValuationAdjustment(reagent_item, connected_realm_id, lastModified, item_depth+1, method_depth+1, allowCap);
                if ("reagent" in iva) {
                    Object.assign(reagent_item, {
                        price: iva.reagent.value,
                        value: parseFloat((iva.reagent.value * reagent_item.quantity).toFixed(2))
                    });
                    queue_cost += Number((iva.reagent.value * reagent_item.quantity).toFixed(2));
                } else {
                    /** failsafe */
                    Object.assign(reagent_item, {
                        price: 0,
                        value: 0
                    })
                }
                reagent_items.push(reagent_item);
            }
        }
        /**
         * End of loop
         * Proc chance
         */
        let n_value = Number((queue_cost / method.item_quantity).toFixed(2));
        if (method.expansion === 'BFA' && method.profession === 'ALCH' && method.rank === 3) {
            n_value = Number(((queue_cost / method.item_quantity) * 0.6).toFixed(2));
        }
        return {
            _id: method._id,
            rank: method.rank || 0,
            queue_cost: Number(queue_cost.toFixed(2)),
            queue_quantity: Number(method.item_quantity),
            nominal_value: n_value,
            lastModified: lastModified,
            reagent_items: reagent_items,
            premium_items: premium_items
        };
    } catch (e) {
        console.error(e);
    }
}

module.exports = methodValuationAdjustment;