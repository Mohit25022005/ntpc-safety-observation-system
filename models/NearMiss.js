const mongoose = require('mongoose');
const { zones } = require('../config/constants');

const nearMissSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    incidentDate: { type: Date, required: true },
    incidentZone: { type: String, enum: zones, required: true },
    incidentLocation: { type: String, required: true },
    incidentDetails: { type: String, required: true },
    uploadedFileUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NearMiss', nearMissSchema);