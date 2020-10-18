const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema(
  {
    /**
     * From Battle.Net ?
     */
    _id: {
      type: Number,
    },
    name: {
      type: String,
    },
    battle_pet_type: {
      type: String,
    },
    description: {
      type: String,
    },
    abilities: {
      type: Array
    },
    properties: {
      is_capturable: Boolean,
      is_tradable: Boolean,
      is_battlepet: Boolean,
      is_alliance_only: Boolean,
      is_horde_only: Boolean,
      is_random_creature_display: Boolean,
    },
    source: {
      type: String,
    },
    icon: {
      type: String
    },
    creature_id: {
      type: Number
    },
    media_id: {
      type: Number
    },
    /**
     * CreatureXDisplayInfo.db2 id as item.modifier.value = 6
     */
    display_id: {
      type: Number,
    },
    /**
     * creature_id => spell_id
     * BattlePetSpecies.db2
     */
    spell_id: {
      type: Number,
    },
    /**
     * spell_id => item_id
     * ItemEffect.db2
     */
    item_id: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ 'creature_id': 1, }, { name: 'CreatureID' });
schema.index({ 'display_id': 1, }, { name: 'DisplayID' });
schema.index({ 'item_id': 1, }, { name: 'ItemID' });
schema.index({ 'spell_id': 1, }, { name: 'SpellID' });

let pets_db = mongoose.model('pets', schema, 'pets');

module.exports = pets_db;