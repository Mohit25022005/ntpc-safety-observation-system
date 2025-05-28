const Observation = require('../models/Observation');
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
        userId,
        userName,
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
            userId,
            userName,
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
        res.status(201).send('Observation Recorded Successfully!');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    renderForm,
    getEICOptions,
    getDepartments,
    submitObservation
};