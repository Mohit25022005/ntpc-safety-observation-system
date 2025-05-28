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
        required: true,
        default: []
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
        type: String
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
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'forwarded', 'closed'],
        default: 'pending'
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completionDate: {
        type: Date
    },
    submissions: [{
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        description: {
            type: String,
            required: true
        },
        fileUrl: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        comment: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    closedBy: {
        type: String, // Stores Zone Leader's name
    },
    closedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Observation', observationSchema);