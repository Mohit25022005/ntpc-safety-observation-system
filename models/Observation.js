const mongoose = require('mongoose');
const { ZONES } = require('../config/zones');

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const submissionSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    fileUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const observationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    zone: {
        type: String,
        required: true,
        enum: ZONES // Uses updated ZONES
    },
    zoneLeaders: [{ type: String }],
    eic: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    uploadedFileUrl: { type: String },
    status: {
        type: String,
        enum: ['pending', 'forwarded', 'closed', 'approved', 'rejected', 'under_review'],
        default: 'pending'
    },
    severity: {
        type: String,
        enum: ['small', 'normal', 'extreme'],
        required: true
    },
    comments: [commentSchema],
    submissions: [submissionSchema],
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    forwardedBy: { type: String },
    forwardedAt: { type: Date },
    closedBy: { type: String },
    closedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    completionDate: { type: Date }
});

module.exports = mongoose.model('Observation', observationSchema);