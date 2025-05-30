/**
 * Issue Controller
 * Handles viewing issue details for observations.
 */

const Observation = require('../../models/Observation');
const User = require('../../models/User');
const { isAuthorizedUser, handleError } = require('./utils');

/**
 * Views details of an observation issue.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const viewIssueDetails = async (req, res, next) => {
    try {
        const observation = await Observation.findById(req.params.id)
            .populate('comments.userId')
            .populate('submissions.vendorId');
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        const user = await User.findById(req.user.id);
        if (!isAuthorizedUser(user, observation)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        res.render('issue_details', { user, observation, errorMessage: null });
    } catch (err) {
        handleError(err, res, '/dashboard', 'View issue details error:');
    }
};

module.exports = { viewIssueDetails };