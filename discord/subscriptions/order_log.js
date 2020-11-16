const { MessageEmbed } = require('discord.js');

const discord_db = require('../../db/models/discord_db')
const auctions_db = require('../../db/models/auctions_db')
const realms_db = require('../../db/models/realms_db')
const { differenceBy } = require('lodash');

async function orderLogs (bot) {
  try {
    /** Every discord subscriber */
    await discord_db
      .find({ type: "orders" })
      .sort({ message_sent: 1 })
      .cursor({ batchSize: 10 })
      .eachAsync( async subscriber => {
        const guild = await bot.guilds.cache.get(subscriber.discord_id);
        if (!guild) {
          return
        }
        const guild_channel = await guild.channels.cache.get(subscriber.channel_id)
        if (!guild_channel) {
          return
        }

        if (!subscriber.id.length) return await guild_channel.send("No items found, please add items and try again")
        if (!subscriber.filters.realm || !subscriber.filters.realm.length) return await guild_channel.send("No realms found, please check out for realms and try again")

        if (subscriber.filters.realm && subscriber.filters.realm.length) {

          const connected_realms = await realms_db.aggregate([
            {
              $match: { 'slug': { '$in': subscriber.filters.realm.map(({ slug }) => slug) } }
            },
            {
              $group: {
                _id: "$connected_realm_id",
                auctions: { $first: "$auctions" },
                connected_realms: { $addToSet: "$slug" }
              }
            }
          ])

          for (const connected_realm_id of connected_realms) {
            const timestamps = await auctions_db.find({ 'connected_realm_id': connected_realm_id._id }).distinct('last_modified')
            if (timestamps.length < 2) {
              return //TODO return timestamps
            }
            timestamps.sort((a, b) => b - a)
            const [ t0, t1 ] = timestamps;

            /**
             * If latest AH timestamp > then
             * starting iterating items for
             * notification message
             */
            if (t0 > connected_realm_id.auctions) {

              const groupOrders = await auctions_db.aggregate([
                {
                  $match: {
                    'connected_realm_id': connected_realm_id,
                    'item.id': { '$in': subscriber.id },
                    'last_modified': { '$in': [
                        t0,
                        t1
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: "$item.id",
                    orders_t0: {
                      $push: {
                        $cond: {
                          if: {
                            $eq: [ "$last_modified", t0 ]
                          },
                          then: {
                            id: "$id",
                            quantity: "$quantity",
                            unit_price: "$unit_price",
                            bid: "$bid",
                            buyout: "$buyout",
                          },
                          else: "$$REMOVE"
                        }
                      }
                    },
                    orders_t1: {
                      $push: {
                        $cond: {
                          if: {
                            $eq: [ "$last_modified", t1 ]
                          },
                          then: {
                            id: "$id",
                            quantity: "$quantity",
                            unit_price: "$unit_price",
                            bid: "$bid",
                            buyout: "$buyout",
                          },
                          else: "$$REMOVE"
                        }
                      }
                    }
                  }
                }
              ]).allowDiskUse(true)

              for (const item_orders of groupOrders) {
                const embed = new MessageEmbed();
                //TODO request item from collection? setThumbnail
                embed.setTitle(`${item_orders._id}@${connected_realm_id}`);
                embed.setURL(encodeURI(`https://${process.env.domain}/item/${item_orders._id}@${connected_realm_id}`));

                const created = differenceBy(item_orders.orders_t0, item_orders.orders_t1, 'id')
                if (created && created.length) {
                  let quantity = 0;
                  let cap = 0;
                  for (const order of created) {
                    quantity += order.quantity
                    if (order.unit_price) cap += order.quantity * order.unit_price
                    if (order.buyout) {
                      cap += order.buyout
                    } else if (order.bid) {
                      cap += order.bid
                    }
                  }
                  embed.addField('Orders added', created.length, true)
                  embed.addField('Quantity added', quantity, true)
                  embed.addField('Cap added', cap, true)
                }

                const removed = differenceBy(item_orders.orders_t1, item_orders.orders_t0, 'id')
                if (removed && removed.length) {
                  let quantity = 0;
                  let cap = 0;
                  for (const order of removed) {
                    quantity += order.quantity
                    if (order.unit_price) cap += order.quantity * order.unit_price
                    if (order.buyout) {
                      cap += order.buyout
                    } else if (order.bid) {
                      cap += order.bid
                    }
                  }
                  embed.addField('Orders added', removed.length, true)
                  embed.addField('Quantity added', quantity, true)
                  embed.addField('Cap added', cap, true)
                }
                embed.setTimestamp(t0 * 1000);
                embed.setFooter(`DMA`);
                await guild_channel.send(embed)
              }

              //TODO change?
              for (const slug of connected_realm_id.connected_realms) {
                const index = subscriber.filters.realm.findIndex(realm => realm.slug === slug)
                subscriber.filters.realm[index].auctions = t0
              }
            }
          }
        }

        subscriber.message_sent = Date.now();
        await subscriber.save()
      })
  } catch (error) {
    console.error(error)
  }
}

module.exports = orderLogs;
