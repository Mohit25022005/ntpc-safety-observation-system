const Observation = require('../models/Observation');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { zones, eicList, departments } = require('../config/constants');
const { ZONES } = require('../config/zones');

const renderForm = async (req, res, next) => {
    try {
        const eics = await User.find({ role: 'eic' });
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        // Pass ZONES as zones to the template
        res.render('index', { 
            user: req.user, 
            eics, 
            successMessage, 
            errorMessage, 
            zones: ZONES // Ensure this is included
        });
    } catch (err) {
        console.error('Render form error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};

const getZoneLeaders = async (req, res, next) => {
    try {
        const { zone } = req.query; // Get the selected zone from query params
        if (!zone) {
            return res.status(400).json({ error: 'Zone is required' });
        }

        // Find users with role 'zone_leader' and matching zone
        const zoneLeaders = await User.find({ role: 'zone_leader', zone: zone });
        if (!zoneLeaders || zoneLeaders.length === 0) {
            return res.status(404).json([]); // Return empty array if no Zone Leaders found
        }

        res.json(zoneLeaders); // Return the list of Zone Leaders
    } catch (err) {
        console.error('Get zone leaders error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getEICOptions = (req, res) => {
    res.json(eicList);
};

const getDepartments = async (req, res, next) => {
    try {
        console.log('Fetching departments from constants...');
        // Use the predefined departments list from constants.js
        if (!departments || departments.length === 0) {
            console.log('No departments found in constants, returning empty array');
            return res.status(404).json([]);
        }
        console.log('Departments found:', departments);
        res.json(departments);
    } catch (err) {
        console.error('Get departments error:', err.message || err);
        res.status(500).json({ error: 'Server error' });
    }
};
const submitObservation = async (req, res, next) => {
    try {
        const { zone, zoneLeaders, eic, department, location, description, severity } = req.body;
        let uploadedFileUrl = null;

        if (req.file) {
            const fileRef = ref(storage, `observations/${Date.now()}_${req.file.originalname}`);
            const snapshot = await uploadBytes(fileRef, req.file.buffer);
            uploadedFileUrl = await getDownloadURL(snapshot.ref);
        }

        const observation = new Observation({
            userId: req.user.id,
            zone,
            zoneLeaders: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders],
            eic,
            department,
            location,
            description,
            severity, // Save the severity
            uploadedFileUrl,
            status: 'pending'
        });

        await observation.save();
        res.redirect('/dashboard?success=Observation submitted successfully');
    } catch (err) {
        console.error('Submit observation error:', err);
        res.redirect('/?error=Failed to submit observation');
    }
};

const renderDashboard = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const role = req.user.role;
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        let observations;
        let closedObservations = [];
        if (role === 'normal') {
            observations = await Observation.find({ userId: req.user.id })
                .populate('comments.userId')
                .populate('submissions.vendorId');
            res.render('dashboards/normal', { user, observations, successMessage, errorMessage });
        } else if (role === 'zone_leader') {
            observations = await Observation.find({ 
                zoneLeaders: { $in: [user.name] }
            }).populate('comments.userId').populate('submissions.vendorId');
            closedObservations = await Observation.find({ 
                closedBy: user.name,
                status: 'closed'
            }).populate('comments.userId').populate('submissions.vendorId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/zone_leader', { 
                user, 
                observations, 
                closedObservations, 
                vendors, 
                successMessage, 
                errorMessage 
            });
        } else if (role === 'eic') {
            observations = await Observation.find({ eic: user.name })
                .populate('comments.userId')
                .populate('submissions.vendorId');
            closedObservations = await Observation.find({ 
                closedBy: user.name,
                status: 'closed'
            }).populate('comments.userId').populate('submissions.vendorId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/eic', { user, observations, closedObservations, vendors, successMessage, errorMessage });
        } else if (role === 'vendor') {
            observations = await Observation.find({ vendorId: req.user.id })
                .populate('comments.userId')
                .populate('submissions.vendorId');
            res.render('dashboards/vendor', { user, observations, successMessage, errorMessage });
        } else if (role === 'admin') {
            // Admin can see all observations
            observations = await Observation.find()
                .populate('comments.userId')
                .populate('submissions.vendorId');
            closedObservations = await Observation.find({ status: 'closed' })
                .populate('comments.userId')
                .populate('submissions.vendorId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/admin', { user, observations, closedObservations, vendors, successMessage, errorMessage });
        } else {
            res.status(403).json({ error: 'Invalid role' });
        }
    } catch (err) {
        console.error('Render dashboard error:', err);
        next(err);
    }
};

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
        if (req.user.role === 'normal' && observation.userId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        if (req.user.role === 'zone_leader' && !observation.zoneLeaders.includes(user.name)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        if (req.user.role === 'eic' && observation.eic !== user.name) {
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
            user
        });
    } catch (err) {
        console.error('Edit observation error:', err);
        next(err);
    }
};

const updateObservation = async (req, res, next) => {
    const {
        zone,
        zoneLeaders,
        eic,
        department,
        eicMobile,
        location,
        description
    } = req.body;

    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        const user = await User.findById(req.user.id);
        if (req.user.role === 'normal' && observation.userId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        if (req.user.role === 'zone_leader' && !observation.zoneLeaders.includes(user.name)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        if (req.user.role === 'eic' && observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        const validZoneLeaders = await User.find({ name: { $in: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders] }, role: 'zone_leader' }).select('name');
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
                        allowed_formats: ['pdf', 'jpeg', 'jpg', 'doc', 'docx']
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
            uploadedFileUrl
        });

        res.redirect('/dashboard?success=Observation updated successfully');
    } catch (err) {
        console.error('Update observation error:', err);
        next(err);
    }
};

const deleteObservation = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (req.user.role === 'normal' && observation.userId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        const user = await User.findById(req.user.id);
        if (req.user.role === 'zone_leader' && !observation.zoneLeaders.includes(user.name)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        if (req.user.role === 'eic' && observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndDelete(req.params.id);
        res.redirect('/dashboard?success=Observation deleted successfully');
    } catch (err) {
        console.error('Delete observation error:', err);
        next(err);
    }
};

const forwardToVendor = async (req, res, next) => {
    const { observationId, vendorId } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!['zone_leader', 'eic'].includes(req.user.role)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        const observation = await Observation.findById(observationId);
        if (req.user.role === 'zone_leader' && !observation.zoneLeaders.includes(user.name)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        if (req.user.role === 'eic' && observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        await Observation.findByIdAndUpdate(observationId, { 
            vendorId, 
            status: 'forwarded',
            forwardedBy: user.name,
            forwardedAt: new Date()
        });
        res.redirect('/dashboard?success=Observation forwarded to vendor');
    } catch (err) {
        console.error('Forward to vendor error:', err);
        next(err);
    }
};

const closeObservation = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const user = await User.findById(req.user.id);
        const observation = await Observation.findById(observationId);

        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (req.user.role === 'eic' && observation.eic === user.name) {
            if (observation.severity === 'small' && observation.status === 'approved') {
                observation.status = 'under_review'; // Forward to Zone Leader for review
                observation.closedBy = user.name;
                observation.closedAt = new Date();
                await observation.save();
                return res.redirect('/dashboard?success=Observation sent to Zone Leader for review');
            } else if (observation.status === 'forwarded') {
                observation.status = 'under_review'; // Forward to Zone Leader for review
                observation.closedBy = user.name;
                observation.closedAt = new Date();
                await observation.save();
                return res.redirect('/dashboard?success=Observation sent to Zone Leader for review');
            }
        }

        return res.redirect('/dashboard?error=Unauthorized or invalid status');
    } catch (err) {
        console.error('Close observation error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};

const addComment = async (req, res, next) => {
    const { observationId, comment } = req.body;
    try {
        const observation = await Observation.findById(observationId);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }
        const user = await User.findById(req.user.id);
        let isAuthorized = false;
        if (req.user.role === 'normal' && observation.userId.toString() === req.user.id) {
            isAuthorized = true;
        } else if (req.user.role === 'zone_leader' && observation.zoneLeaders.includes(user.name)) {
            isAuthorized = true;
        } else if (req.user.role === 'eic' && observation.eic === user.name) {
            isAuthorized = true;
        } else if (req.user.role === 'vendor' && observation.vendorId && observation.vendorId.toString() === req.user.id) {
            isAuthorized = true;
        }
        if (!isAuthorized) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        await Observation.findByIdAndUpdate(observationId, {
            $push: { 
                comments: { 
                    userId: req.user.id, 
                    comment 
                } 
            }
        });
        res.redirect('/dashboard?success=Comment added');
    } catch (err) {
        console.error('Add comment error:', err);
        next(err);
    }
};

const updateCompletionDate = async (req, res, next) => {
    const { observationId, completionDate } = req.body;
    try {
        const observation = await Observation.findById(observationId);
        if (!observation || observation.vendorId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        await Observation.findByIdAndUpdate(observationId, { completionDate });
        res.redirect('/dashboard?success=Completion date updated');
    } catch (err) {
        console.error('Update completion date error:', err);
        next(err);
    }
};

const approveObservation = async (req, res, next) => {
    const { observationId } = req.body;
    try {
        const observation = await Observation.findById(observationId);
        const user = await User.findById(req.user.id);
        if (req.user.role !== 'eic' || observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        await Observation.findByIdAndUpdate(observationId, { status: 'approved' });
        res.redirect('/dashboard?success=Observation approved');
    } catch (err) {
        console.error('Approve observation error:', err);
        next(err);
    }
};

const rejectObservation = async (req, res, next) => {
    const { observationId } = req.body;
    try {
        const observation = await Observation.findById(observationId);
        const user = await User.findById(req.user.id);
        if (req.user.role !== 'eic' || observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        await Observation.findByIdAndUpdate(observationId, { status: 'rejected' });
        res.redirect('/dashboard?success=Observation rejected');
    } catch (err) {
        console.error('Reject observation error:', err);
        next(err);
    }
};

const renderVendorSubmissionForm = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }
        if (observation.vendorId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        res.render('vendor_submission', { observation, errorMessage: null, user: req.user });
    } catch (err) {
        console.error('Render vendor submission form error:', err);
        next(err);
    }
};

const submitVendorWork = async (req, res, next) => {
    const { observationId, description } = req.body;
    try {
        const observation = await Observation.findById(observationId);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }
        if (observation.vendorId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        let fileUrl = '';
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'ntpc_safety_submissions',
                        allowed_formats: ['pdf', 'jpeg', 'jpg', 'doc', 'docx']
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            fileUrl = result.secure_url;
        }

        await Observation.findByIdAndUpdate(observationId, {
            $push: {
                submissions: {
                    vendorId: req.user.id,
                    description,
                    fileUrl
                }
            }
        });

        res.redirect('/dashboard?success=Work submitted successfully');
    } catch (err) {
        console.error('Submit vendor work error:', err);
        next(err);
    }
};

const viewIssueDetails = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id)
            .populate('comments.userId')
            .populate('submissions.vendorId');
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        const user = await User.findById(req.user.id);
        let isAuthorized = false;
        if (req.user.role === 'normal' && observation.userId.toString() === req.user.id) {
            isAuthorized = true;
        } else if (req.user.role === 'zone_leader' && observation.zoneLeaders.includes(user.name)) {
            isAuthorized = true;
        } else if (req.user.role === 'eic' && observation.eic === user.name) {
            isAuthorized = true;
        } else if (req.user.role === 'vendor' && observation.vendorId && observation.vendorId.toString() === req.user.id) {
            isAuthorized = true;
        } else if (req.user.role === 'admin') {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        res.render('issue_details', { user, observation, errorMessage: null });
    } catch (err) {
        console.error('View issue details error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};

const reviewAndForwardToZoneLeader = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const user = await User.findById(req.user.id);
        const observation = await Observation.findById(observationId);

        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (req.user.role !== 'eic' || observation.eic !== user.name || observation.status !== 'forwarded') {
            return res.redirect('/dashboard?error=Unauthorized or invalid status');
        }

        observation.status = 'under_review'; // Forward to Zone Leader for review
        observation.forwardedBy = user.name;
        observation.forwardedAt = new Date();
        await observation.save();
        res.redirect('/dashboard?success=Observation sent to Zone Leader for review');
    } catch (err) {
        console.error('Review and forward error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};
const resolveObservation = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const user = await User.findById(req.user.id);
        const observation = await Observation.findById(observationId);

        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (req.user.role !== 'vendor' || !observation.vendorId || observation.vendorId.toString() !== req.user.id || observation.status !== 'forwarded') {
            return res.redirect('/dashboard?error=Unauthorized or invalid status');
        }

        observation.status = 'forwarded'; // Status remains 'forwarded', EIC will review
        observation.comments.push({
            userId: user._id,
            comment: 'Issue marked as resolved by Vendor',
            createdAt: new Date()
        });
        await observation.save();
        res.redirect('/dashboard?success=Issue marked as resolved');
    } catch (err) {
        console.error('Resolve observation error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};

const zoneLeaderCloseObservation = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const user = await User.findById(req.user.id);
        const observation = await Observation.findById(observationId);

        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (req.user.role !== 'zone_leader' || !observation.zoneLeaders.includes(user.name) || observation.status !== 'under_review') {
            return res.redirect('/dashboard?error=Unauthorized or invalid status');
        }

        observation.status = 'closed';
        observation.closedBy = user.name;
        observation.closedAt = new Date();
        await observation.save();

        // Notify the Normal User (for simplicity, add a comment)
        const normalUser = await User.findById(observation.userId);
        observation.comments.push({
            userId: user._id,
            comment: `Issue closed by Zone Leader. Status updated for ${normalUser.name}.`,
            createdAt: new Date()
        });
        await observation.save();

        res.redirect('/dashboard?success=Observation closed successfully');
    } catch (err) {
        console.error('Zone Leader close observation error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};

const zoneLeaderResendToVendor = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const user = await User.findById(req.user.id);
        const observation = await Observation.findById(observationId);

        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        if (req.user.role !== 'zone_leader' || !observation.zoneLeaders.includes(user.name) || observation.status !== 'under_review') {
            return res.redirect('/dashboard?error=Unauthorized or invalid status');
        }

        observation.status = 'forwarded';
        observation.comments.push({
            userId: user._id,
            comment: 'Work incomplete. Resent to Vendor for updates.',
            createdAt: new Date()
        });
        await observation.save();

        res.redirect('/dashboard?success=Observation resent to Vendor');
    } catch (err) {
        console.error('Zone Leader resend to vendor error:', err);
        res.redirect('/dashboard?error=Server error');
    }
};

// Update exports
module.exports = {
    renderForm,
    getZoneLeaders,
    getDepartments,
    submitObservation,
    renderDashboard,
    editObservation,
    updateObservation,
    deleteObservation,
    forwardToVendor,
    closeObservation,
    addComment,
    updateCompletionDate,
    approveObservation,
    rejectObservation,
    renderVendorSubmissionForm,
    submitVendorWork,
    viewIssueDetails,
    reviewAndForwardToZoneLeader,
    resolveObservation,
    zoneLeaderCloseObservation,
    zoneLeaderResendToVendor // Add the new functions
};

