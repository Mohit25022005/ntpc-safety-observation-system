const Observation = require('../models/Observation');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { zones, eicList, departments } = require('../config/constants');

const renderForm = async (req, res, next) => {
    try {
        const zoneLeaders = await User.find({ role: 'zone_leader' }).select('name');
        res.render('index', {
            zones,
            eicList,
            departments,
            zoneLeaders: zoneLeaders.map(leader => leader.name),
            errorMessage: req.query.error || null
        });
    } catch (err) {
        next(err);
    }
};

const getZoneLeaders = async (req, res, next) => {
    try {
        const zoneLeaders = await User.find({ role: 'zone_leader' }).select('name');
        res.json(zoneLeaders.map(leader => leader.name));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

const getEICOptions = (req, res) => {
    res.json(eicList);
};

const getDepartments = (req, res) => {
    res.json(departments);
};

const submitObservation = async (req, res, next) => {
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
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.redirect('/?error=User not found');
        }

        // Validate Zone Leaders
        const validZoneLeaders = await User.find({ name: { $in: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders] }, role: 'zone_leader' }).select('name');
        if (validZoneLeaders.length !== (Array.isArray(zoneLeaders) ? zoneLeaders.length : 1)) {
            return res.redirect('/?error=Invalid Zone Leader selected');
        }

        let uploadedFileUrl = '';
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

        const observation = new Observation({
            userId: req.user.id,
            userName: user.name,
            zone,
            zoneLeaders: Array.isArray(zoneLeaders) ? zoneLeaders : [zoneLeaders],
            eic,
            department,
            eicMobile,
            location,
            description,
            uploadedFileUrl
        });

        await observation.save();
        res.redirect('/dashboard?success=Observation recorded successfully');
    } catch (err) {
        console.error('Submit observation error:', err);
        next(err);
    }
};

const renderDashboard = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const role = req.user.role;
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        let observations;
        if (role === 'normal') {
            observations = await Observation.find({ userId: req.user.id });
            res.render('dashboards/normal', { user, observations, successMessage, errorMessage });
        } else if (role === 'zone_leader') {
            observations = await Observation.find({ zoneLeaders: { $in: [user.name] } }).populate('comments.userId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/zone_leader', { user, observations, vendors, successMessage, errorMessage });
        } else if (role === 'eic') {
            observations = await Observation.find({ eic: user.name }).populate('comments.userId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/eic', { user, observations, vendors, successMessage, errorMessage });
        } else if (role === 'vendor') {
            observations = await Observation.find({ vendorId: req.user.id }).populate('comments.userId');
            res.render('dashboards/vendor', { user, observations, successMessage, errorMessage });
        } else {
            res.status(403).json({ error: 'Invalid role' });
        }
    } catch (err) {
        next(err);
    }
};

const editObservation = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        // Ensure zoneLeaders is an array
        if (!Array.isArray(observation.zoneLeaders)) {
            observation.zoneLeaders = observation.zoneLeaders ? [observation.zoneLeaders] : [];
            await observation.save();
        }

        // Restrict access: Normal Users can only edit their own; Zone Leaders/EICs can edit if assigned
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
        console.log('Rendering edit form for observation:', observation._id, 'zoneLeaders:', observation.zoneLeaders); // Debug log
        res.render('edit_observation', {
            observation,
            zones,
            eicList,
            departments,
            zoneLeaders: zoneLeaders.map(leader => leader.name),
            errorMessage: null
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

        // Restrict access
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

        // Validate Zone Leaders
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

        // Restrict access: Only Normal Users can delete their own observations
        if (req.user.role === 'normal' && observation.userId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }
        // Optionally, allow Zone Leaders/EICs to delete if assigned
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
        await Observation.findByIdAndUpdate(observationId, { vendorId, status: 'forwarded' });
        res.redirect('/dashboard?success=Observation forwarded to vendor');
    } catch (err) {
        next(err);
    }
};

const closeObservation = async (req, res, next) => {
    const { observationId } = req.body;
    try {
        await Observation.findByIdAndUpdate(observationId, { status: 'closed' });
        res.redirect('/dashboard?success=Observation closed');
    } catch (err) {
        next(err);
    }
};

const addComment = async (req, res, next) => {
    const { observationId, comment } = req.body;
    try {
        await Observation.findByIdAndUpdate(observationId, {
            $push: { comments: { userId: req.user.id, comment } }
        });
        res.redirect('/dashboard?success=Comment added');
    } catch (err) {
        next(err);
    }
};

const updateCompletionDate = async (req, res, next) => {
    const { observationId, completionDate } = req.body;
    try {
        await Observation.findByIdAndUpdate(observationId, { completionDate });
        res.redirect('/dashboard?success=Completion date updated');
    } catch (err) {
        next(err);
    }
};

const approveObservation = async (req, res, next) => {
    const { observationId } = req.body;
    try {
        await Observation.findByIdAndUpdate(observationId, { status: 'approved' });
        res.redirect('/dashboard?success=Observation approved');
    } catch (err) {
        next(err);
    }
};

const rejectObservation = async (req, res, next) => {
    const { observationId } = req.body;
    try {
        await Observation.findByIdAndUpdate(observationId, { status: 'rejected' });
        res.redirect('/dashboard?success=Observation rejected');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    renderForm,
    getZoneLeaders,
    getEICOptions,
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
    rejectObservation
};