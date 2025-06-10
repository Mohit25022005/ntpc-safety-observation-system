const Observation = require('../../models/Observation');
const User = require('../../models/User');
const NearMiss = require('../../models/NearMiss');
const cloudinary = require('../../config/cloudinary');
const { zones, eicList, departments } = require('../../config/constants');
const { handleError, isAuthorizedUser } = require('./utils');

// Store SSE clients
const clients = {};

/**
 * Submits a new safety observation and notifies clients of count update.
 */
const submitObservation = async (req, res, next) => {
    try {
        const { zone, zoneLeaders, eic, department, location, description, severity } = req.body;
        let uploadedFileUrl = null;

        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'ntpc_safety_observations',
                        allowed_formats: ['pdf', 'jpeg', 'jpg', 'doc', 'docx'],
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            uploadedFileUrl = result.secure_url;
        }

        const observation = new Observation({
            userId: req.user.id,
            zone,
            zoneLeaders: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders],
            eic,
            department,
            location,
            description,
            severity,
            uploadedFileUrl,
            status: 'pending',
        });

        await observation.save();

        // Notify clients of updated observation count
        await broadcastObservationCount(req.user.id);

        res.redirect('/dashboard?success=Observation submitted successfully');
    } catch (err) {
        handleError(err, res, '/', 'Submit observation error:');
    }
};

/**
 * Broadcasts updated observation count to all connected clients.
 */
const broadcastObservationCount = async (triggeringUserId) => {
    try {
        // Fetch all users to compute role-specific counts
        const users = await User.find();
        const totalObservations = await Observation.countDocuments();

        for (const clientId in clients) {
            const client = clients[clientId];
            const user = users.find(u => u.id === client.userId);
            if (!user) continue;

            let count;
            switch (user.role) {
                case 'normal':
                    count = await Observation.countDocuments({ userId: user.id });
                    break;
                case 'zone_leader':
                case 'eic':
                case 'vendor':
                    count = totalObservations;
                    break;
                case 'admin':
                    count = totalObservations;
                    break;
                default:
                    count = 0;
            }

            // Send updated count to client
            client.res.write(`data: ${JSON.stringify({ count })}\n\n`);
        }
    } catch (err) {
        console.error('Broadcast observation count error:', err.message || err);
    }
};

/**
 * Handles SSE connection for real-time observation count updates.
 */
const handleObservationCountSSE = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Initialize client
        const clientId = Date.now().toString();
        clients[clientId] = { res, userId };

        // Send initial count
        const user = await User.findById(userId);
        let initialCount;
        switch (user.role) {
            case 'normal':
                initialCount = await Observation.countDocuments({ userId });
                break;
            case 'zone_leader':
            case 'eic':
            case 'vendor':
                initialCount = await Observation.countDocuments();
                break;
            case 'admin':
                initialCount = await Observation.countDocuments();
                break;
            default:
                initialCount = 0;
        }
        res.write(`data: ${JSON.stringify({ count: initialCount })}\n\n`);

        // Clean up on client disconnect
        req.on('close', () => {
            delete clients[clientId];
        });
    } catch (err) {
        console.error('SSE connection error:', err.message || err);
        res.status(500).end();
    }
};

/**
 * Renders the dashboard with dynamic data.
 */
const renderDashboard = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const role = req.user.role;
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        // Fetch zone-wise observation counts
        const zoneCounts = await Observation.aggregate([
            { $group: { _id: '$zone', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const maxObservationCount = zoneCounts.length > 0 ? Math.max(...zoneCounts.map(z => z.count)) : 1;
        const zoneData = zones.map(zoneName => {
            const zone = zoneCounts.find(z => z._id === zoneName) || { _id: zoneName, count: 0 };
            return { name: zone._id, count: zone.count };
        });

        // Fetch role-specific observations
        let observations = [];
        let nearMisses = [];
        let stats = { totalObservations: 0, nearMisses: 0 };

        switch (role) {
            case 'normal':
                observations = await Observation.find({ userId: req.user.id })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                nearMisses = await NearMiss.find({ userId: req.user.id });
                stats.totalObservations = observations.length;
                stats.nearMisses = nearMisses.length;
                break;

            case 'zone_leader':
                observations = await Observation.find({ zoneLeaders: { $in: [user.name] } })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                nearMisses = await NearMiss.find({ incidentZone: user.zone });
                stats.totalObservations = await Observation.countDocuments();
                stats.nearMisses = nearMisses.length;
                break;

            case 'eic':
                observations = await Observation.find({ eic: user.name })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                nearMisses = await NearMiss.find({ incidentZone: { $in: zones } });
                stats.totalObservations = await Observation.countDocuments();
                stats.nearMisses = nearMisses.length;
                break;

            case 'vendor':
                observations = await Observation.find({ vendorId: req.user.id })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                nearMisses = [];
                stats.totalObservations = await Observation.countDocuments();
                stats.nearMisses = 0;
                break;

            case 'admin':
                observations = await Observation.find()
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                nearMisses = await NearMiss.find();
                stats.totalObservations = await Observation.countDocuments();
                stats.nearMisses = await NearMiss.countDocuments();
                break;

            default:
                return res.status(403).json({ error: 'Invalid role' });
        }

        res.render('dashboards/dashboard', {
            user,
            successMessage,
            errorMessage,
            zones: zoneData,
            maxObservationCount,
            observations,
            nearMisses,
            stats
        });
    } catch (err) {
        console.error('Render dashboard error:', err.message || err);
        next(err);
    }
};

/**
 * Renders the edit observation form.
 */
const editObservation = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (!Array.isArray(observation.zoneLeaders)) {
            observation.zoneLeaders = observation.zoneLeaders ? [observation.zoneLeaders] : [];
            await observation.save();
        }

        const user = await User.findById(req.user.id);
        if (!isAuthorizedUser(user, observation)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        const zoneLeaders = await User.find({ role: 'zone_leader' }).select('name');
        res.render('edit_observation', {
            observation,
            zones,
            eicList,
            departments,
            zoneLeaders: zoneLeaders.map(leader => leader.name),
            errorMessage: null,
            user,
        });
    } catch (err) {
        console.error('Edit observation error:', err.message || err);
        next(err);
    }
};

/**
 * Updates an existing observation.
 */
const updateObservation = async (req, res, next) => {
    try {
        const { zone, zoneLeaders, eic, department, eicMobile, location, description } = req.body;
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        const user = await User.findById(req.user.id);
        if (!isAuthorizedUser(user, observation)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        const validZoneLeaders = await User.find({
            name: { $in: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders] },
            role: 'zone_leader',
        }).select('name');
        if (validZoneLeaders.length !== (Array.isArray(zoneLeaders) ? zoneLeaders.length : 1)) {
            return res.redirect(`/observation/edit/${req.params.id}?error=Invalid Zone Leader selected`);
        }

        let uploadedFileUrl = observation.uploadedFileUrl;
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'ntpc_safety_observations',
                        allowed_formats: ['pdf', 'jpeg', 'jpg', 'doc', 'docx'],
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            uploadedFileUrl = result.secure_url;
        }

        await Observation.findByIdAndUpdate(req.params.id, {
            zone,
            zoneLeaders: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders],
            eic,
            department,
            eicMobile,
            location,
            description,
            uploadedFileUrl,
        });

        // Notify clients of updated observation count
        await broadcastObservationCount(req.user.id);

        res.redirect('/dashboard?success=Observation updated successfully');
    } catch (err) {
        console.error('Update observation error:', err.message || err);
        next(err);
    }
};

/**
 * Deletes an observation.
 */
const deleteObservation = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        const user = await User.findById(req.user.id);
        if (!isAuthorizedUser(user, observation)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndDelete(req.params.id);

        // Notify clients of updated observation count
        await broadcastObservationCount(req.user.id);

        res.redirect('/dashboard?success=Observation deleted successfully');
    } catch (err) {
        console.error('Delete observation error:', err.message || err);
        next(err);
    }
};

// Render the form to forward an observation to a vendor
const renderForwardForm = async (req, res) => {
    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.status(404).render('error', { message: 'Observation not found' });
        }
        // Fetch users with role 'vendor'
        const vendors = await User.find({ role: 'vendor' }).select('name email');
        res.render('forwardObservation', { observation, vendors, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server error' });
    }
};

// Forward observation to a vendor
const forwardToVendor = async (req, res) => {
    try {
        const { observationId, vendorId } = req.body;
        const observation = await Observation.findById(observationId);
        if (!observation) {
            return res.status(404).json({ error: 'Observation not found' });
        }
        const vendor = await User.findById(vendorId);
        if (!vendor || vendor.role !== 'vendor') {
            return res.status(400).json({ error: 'Invalid vendor selected' });
        }
        observation.vendorId = vendorId;
        observation.forwardedBy = req.user.name;
        observation.forwardedAt = new Date();
        observation.status = 'forwarded';
        await observation.save();
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { renderForwardForm,forwardToVendor,submitObservation, renderDashboard, editObservation, updateObservation, deleteObservation, handleObservationCountSSE, broadcastObservationCount };