/**
 * Utility functions for observation controllers.
 */

/**
 * Handles errors consistently across controllers.
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 * @param {string} redirectUrl - URL to redirect to
 * @param {string} errorMessage - Error message to log
 */
const handleError = (err, res, redirectUrl, errorMessage) => {
    console.error(errorMessage, err.message || err);
    res.redirect(`${redirectUrl}?error=Server error`);
};

/**
 * Checks if a user is authorized to perform actions on an observation.
 * @param {Object} user - The user object
 * @param {Object} observation - The observation object
 * @returns {boolean} - Whether the user is authorized
 */
const isAuthorizedUser = (user, observation) => {
    if (user.role === 'normal' && observation.userId.toString() !== user.id) {
        return false;
    }
    if (user.role === 'zone_leader' && !observation.zoneLeaders.includes(user.name)) {
        return false;
    }
    if (user.role === 'eic' && observation.eic !== user.name) {
        return false;
    }
    if (user.role === 'vendor' && observation.vendorId && observation.vendorId.toString() !== user.id) {
        return false;
    }
    if (user.role === 'admin') {
        return true;
    }
    return true;
};

module.exports = { handleError, isAuthorizedUser };