const User = require('../../models/User');
const NearMiss = require('../../models/NearMiss');
const { ZONES } = require('../../config/zones');
const { zones, eicList, departments } = require('../../config/constants');
const { handleError } = require('./utils');
const cloudinary = require('../../config/cloudinary');
const { getSimilarityScores  } = require('../../services/similarityService')
/**
 * Renders the observation submission form.
 */
const renderForm = async (req, res, next) => {
    try {
        const eics = await User.find({ role: 'eic' });
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        res.render('index', {
            layout: 'layouts/main',
            title: 'Home',
            user: req.user,
            eics,
            successMessage,
            errorMessage,
            zones: ZONES,
        });
    } catch (err) {
        handleError(err, res, '/dashboard', 'Render form error:');
    }
};

/**
 * Fetches Zone Leaders for a given zone.
 */
const getZoneLeaders = async (req, res, next) => {
    try {
        const { zone } = req.query;
        if (!zone) {
            return res.status(400).json({ error: 'Zone is required' });
        }

        const zoneLeaders = await User.find({ role: 'zone_leader', zone });
        if (!zoneLeaders || zoneLeaders.length === 0) {
            return res.status(404).json([]);
        }

        res.json(zoneLeaders);
    } catch (err) {
        console.error('Get zone leaders error:', err.message || err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Fetches the list of departments from constants.
 */
const getDepartments = async (req, res, next) => {
    try {
        console.log('Fetching departments from constants...');
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

/**
 * Fetches the list of EICs from constants.
 */
const getEICOptions = (req, res) => {
    res.json(eicList);
};

/**
 * Renders the near miss incident report form.
 */
const renderNearMissForm = async (req, res, next) => {
    try {
        const user = req.user;
        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;

        if (!['normal', 'eic', 'zone_leader', 'admin'].includes(user.role)) {
            return res.render('report-near-miss', {
                user,
                successMessage: null,
                errorMessage: 'Unauthorized access to near miss reporting',
                zones,
                similarReports: [],          // ✅ added
                previousInput: {}            // ✅ added
            });
        }

        res.render('report-near-miss', {
            user,
            successMessage,
            errorMessage,
            zones,
            similarReports: [],              // ✅ added
            previousInput: {}                // ✅ added
        });
    } catch (err) {
        console.error('Render near miss form error:', err.message || err);
        handleError(err, res, '/dashboard', 'Render near miss form error:');
    }
};


/**
 * Submits a near miss incident report.
 */
const submitNearMiss = async (req, res, next) => {
    try {
        const user = req.user;
        if (!['normal', 'eic', 'zone_leader', 'admin'].includes(user.role)) {
            return res.redirect('/dashboard?error=Unauthorized to submit near miss');
        }

        const { incidentDate, incidentZone, incidentLocation, incidentDetails } = req.body;

        // 1. Fetch existing reports (last 30 days, same zone)
        const recentReports = await NearMiss.find({
            incidentZone,
            incidentDate: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }
        });

        // 2. Check for similarity (updated to handle new format)
        const similarityResponse = await getSimilarityScores(incidentDetails, recentReports);
        const isDuplicate = similarityResponse?.is_duplicate;
        const similarMatches = similarityResponse?.similar_matches || [];

        if (isDuplicate) {
            const similarReportsWithLinks = similarMatches.map((report) => ({
                id: report.id,
                score: report.score.toFixed(2),
                url: `/near-miss/${report.id}` // assumes such a route exists
            }));

            return res.render('report-near-miss', {
                user,
                zones,
                errorMessage: '🚫 Similar incident already exists! Please review the following:',
                successMessage: null,
                previousInput: req.body,
                similarReports: similarReportsWithLinks
            });
        }

        // 3. Upload file if exists
        let uploadedFileUrl = null;
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'ntpc_safety_near_misses',
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

        // 4. Save if no duplicates
        const nearMiss = new NearMiss({
            userId: user.id,
            incidentDate: new Date(incidentDate),
            incidentZone,
            incidentLocation,
            incidentDetails,
            uploadedFileUrl
        });

        await nearMiss.save();
        res.redirect('/dashboard?success=Near miss incident reported successfully');

    } catch (err) {
        console.error('Submit near miss error:', err.message || err);
        handleError(err, res, '/report-near-miss', 'Submit near miss error:');
    }
};



/**
 * Views details of a near miss incident.
 */
const viewNearMissDetails = async (req, res, next) => {
    try {
        const user = req.user;
        const nearMiss = await NearMiss.findById(req.params.id).populate('userId', 'name');

        if (!nearMiss) {
            return res.redirect('/dashboard?error=Near miss incident not found');
        }

        // Role-based access control
        let isAuthorized = false;
        if (user.role === 'admin') {
            isAuthorized = true;
        } else if (user.role === 'normal' && nearMiss.userId._id.toString() === user.id) {
            isAuthorized = true;
        } else if (user.role === 'zone_leader' && nearMiss.incidentZone === user.zone) {
            isAuthorized = true;
        } else if (user.role === 'eic') {
            isAuthorized = true; // EICs can view all near misses
        }

        if (!isAuthorized) {
            return res.redirect('/dashboard?error=Unauthorized to view this near miss');
        }

        res.render('near-miss-details', {
            user,
            nearMiss,
            successMessage: req.query.success || null,
            errorMessage: req.query.error || null
        });
    } catch (err) {
        console.error('View near miss details error:', err.message || err);
        handleError(err, res, '/dashboard', 'View near miss details error:');
    }
};

module.exports = { renderForm, getZoneLeaders, getDepartments, getEICOptions, renderNearMissForm, submitNearMiss, viewNearMissDetails };