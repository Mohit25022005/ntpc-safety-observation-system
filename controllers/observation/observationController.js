/**
 * Observation Controller
 * Handles core observation CRUD operations (submit, view, edit, update, delete).
 */

const Observation = require('../../models/Observation');
const User = require('../../models/User');
const cloudinary = require('../../config/cloudinary');
const { zones, eicList, departments } = require('../../config/constants');
const { handleError, isAuthorizedUser } = require('./utils');

/**
 * Submits a new safety observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
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
        res.redirect('/dashboard?success=Observation submitted successfully');
    } catch (err) {
        handleError(err, res, '/', 'Submit observation error:');
    }
};

/**
 * Renders the dashboard based on the user's role.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const renderDashboard = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const role = req.user.role;
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        let observations;
        let closedObservations = [];
        let viewData = { user, successMessage, errorMessage };

        switch (role) {
            case 'normal':
                observations = await Observation.find({ userId: req.user.id })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                res.render('dashboards/normal', { ...viewData, observations });
                break;

            case 'zone_leader':
                observations = await Observation.find({ zoneLeaders: { $in: [user.name] } })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                closedObservations = await Observation.find({ closedBy: user.name, status: 'closed' })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                const vendorsZL = await User.find({ role: 'vendor' });
                res.render('dashboards/zone_leader', {
                    ...viewData,
                    observations,
                    closedObservations,
                    vendors: vendorsZL,
                });
                break;

            case 'eic':
                observations = await Observation.find({ eic: user.name })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                closedObservations = await Observation.find({ closedBy: user.name, status: 'closed' })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                const vendorsEIC = await User.find({ role: 'vendor' });
                res.render('dashboards/eic', {
                    ...viewData,
                    observations,
                    closedObservations,
                    vendors: vendorsEIC,
                });
                break;

            case 'vendor':
                observations = await Observation.find({ vendorId: req.user.id })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                res.render('dashboards/vendor', { ...viewData, observations });
                break;

            case 'admin':
                observations = await Observation.find()
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                closedObservations = await Observation.find({ status: 'closed' })
                    .populate('comments.userId')
                    .populate('submissions.vendorId');
                const vendorsAdmin = await User.find({ role: 'vendor' });
                res.render('dashboards/admin', {
                    ...viewData,
                    observations,
                    closedObservations,
                    vendors: vendorsAdmin,
                });
                break;

            default:
                res.status(403).json({ error: 'Invalid role' });
        }
    } catch (err) {
        console.error('Render dashboard error:', err.message || err);
        next(err);
    }
};

/**
 * Renders the edit observation form.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
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

        res.redirect('/dashboard?success=Observation updated successfully');
    } catch (err) {
        console.error('Update observation error:', err.message || err);
        next(err);
    }
};

/**
 * Deletes an observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
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
        res.redirect('/dashboard?success=Observation deleted successfully');
    } catch (err) {
        console.error('Delete observation error:', err.message || err);
        next(err);
    }
};

module.exports = { submitObservation, renderDashboard, editObservation, updateObservation, deleteObservation };