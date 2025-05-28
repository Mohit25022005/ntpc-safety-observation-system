const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    zone: {
        type: String,
        required: true
    },
    zoneLeaders: {
        type: [String],
        required: true
    },
    eic: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    eicMobile: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    uploadedFileUrl: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'forwarded', 'closed'],
        default: 'pending'
    },
    comments: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completionDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Observation', observationSchema);