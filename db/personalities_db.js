const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let schema = new mongoose.Schema({
    _id: {
        type: String,
    },
    codename: {
        type: String,
        default: 'Unknown',
        required: true
    },
    clearance: [
        {
            access: {
                type: Number,
                enum: [0, 1, 2, 3],  /** IDEA getter/setter test for clearance.access word */
                default: 0
            },
            codeword: {
                type: String,
                default: 'WoW',
                required: true
            }
        }
    ],
    aliases: [
        {
            type: {
                type: String,
                enum: ['discord', 'battle.tag', 'twitter', 'name', 'character', 'nickname'],
                required: true
            },
            value: String,
        }
    ]
},{
    timestamps: true
});

let personalities_db = mongoose.model('personalities', schema, 'personalities');

module.exports = personalities_db;