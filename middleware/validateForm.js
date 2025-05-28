const { zones, eicList, departments } = require('../config/constants');

const validateForm = (req, res, next) => {
    const { userId, userName, zone, zoneLeaders, eic, department, eicMobile, location, description } = req.body;

    if (!userId || !userName || !zone || !zoneLeaders || !eic || !department || !eicMobile || !location || !description) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!zones.includes(zone)) {
        return res.status(400).json({ error: 'Invalid zone selected' });
    }

    if (!eicList.includes(eic)) {
        return res.status(400).json({ error: 'Invalid EIC selected' });
    }

    if (!departments.includes(department)) {
        return res.status(400).json({ error: 'Invalid department selected' });
    }

    if (!/^\d{10}$/.test(eicMobile)) {
        return res.status(400).json({ error: 'Invalid mobile number. Must be 10 digits' });
    }

    req.validatedData = { zones, eicList, departments };
    next();
};

module.exports = validateForm;