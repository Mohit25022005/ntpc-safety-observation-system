const Observation = require('../models/Observation');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { zones, eicList, departments } = require('../config/constants');

const renderForm = (req, res, constants = {}) => {
    const { zones: formZones = zones, eicList: formEicList = eicList, departments: formDepartments = departments } = constants;
    res.render('index', { zones: formZones, eicList: formEicList, departments: formDepartments });
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
            userName: req.user.name,
            zone,
            zoneLeaders,
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
        next(err);
    }
};

const renderDashboard = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const role = req.user.role;
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        if (role === 'normal') {
            const observations = await Observation.find({ userId: req.user.id });
            res.render('dashboards/normal', { user, observations, successMessage, errorMessage });
        } else if (role === 'zone_leader') {
            const observations = await Observation.find({ zoneLeaders: user.name }).populate('comments.userId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/zone_leader', { user, observations, vendors, successMessage, errorMessage });
        } else if (role === 'eic') {
            const observations = await Observation.find({ eic: user.name }).populate('comments.userId');
            const vendors = await User.find({ role: 'vendor' });
            res.render('dashboards/eic', { user, observations, vendors, successMessage, errorMessage });
        } else if (role === 'vendor') {
            const observations = await Observation.find({ vendorId: req.user.id }).populate('comments.userId');
            res.render('dashboards/vendor', { user, observations, successMessage, errorMessage });
        } else {
            res.status(403).json({ error: 'Invalid role' });
        }
    } catch (err) {
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
    getEICOptions,
    getDepartments,
    submitObservation,
    renderDashboard,
    forwardToVendor,
    closeObservation,
    addComment,
    updateCompletionDate,
    approveObservation,
    rejectObservation
};