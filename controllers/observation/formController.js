const User = require('../../models/User');
const { ZONES } = require('../../config/zones');
const { eicList, departments } = require('../../config/constants');
const { handleError } = require('./utils');

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

module.exports = { renderForm, getZoneLeaders, getDepartments, getEICOptions };