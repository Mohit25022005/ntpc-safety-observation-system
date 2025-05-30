/**
 * Action Controller
 * Handles observation actions such as forwarding, closing, commenting, and approving.
 */

const Observation = require('../../models/Observation');
const User = require('../../models/User');
const { handleError, isAuthorizedUser } = require('./utils');

/**
 * Forwards an observation to a vendor.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const forwardToVendor = async (req, res, next) => {
    try {
        const { observationId, vendorId } = req.body;
        const user = await User.findById(req.user.id);
        if (!['zone_leader', 'eic'].includes(req.user.role)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        const observation = await Observation.findById(observationId);
        if (!isAuthorizedUser(user, observation)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndUpdate(observationId, {
            vendorId,
            status: 'forwarded',
            forwardedBy: user.name,
            forwardedAt: new Date(),
        });
        res.redirect('/dashboard?success=Observation forwarded to vendor');
    } catch (err) {
        console.error('Forward to vendor error:', err.message || err);
        next(err);
    }
};

/**
 * Closes an observation and forwards it to Zone Leader for review if needed.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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
                observation.status = 'under_review';
                observation.closedBy = user.name;
                observation.closedAt = new Date();
                await observation.save();
                return res.redirect('/dashboard?success=Observation sent to Zone Leader for review');
            } else if (observation.status === 'forwarded') {
                observation.status = 'under_review';
                observation.closedBy = user.name;
                observation.closedAt = new Date();
                await observation.save();
                return res.redirect('/dashboard?success=Observation sent to Zone Leader for review');
            }
        }

        return res.redirect('/dashboard?error=Unauthorized or invalid status');
    } catch (err) {
        handleError(err, res, '/dashboard', 'Close observation error:');
    }
};

/**
 * Adds a comment to an observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const addComment = async (req, res, next) => {
    try {
        const { observationId, comment } = req.body;
        const observation = await Observation.findById(observationId);
        if (!observation) {
            return res.redirect('/dashboard?error=Observation not found');
        }

        const user = await User.findById(req.user.id);
        if (!isAuthorizedUser(user, observation)) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndUpdate(observationId, {
            $push: {
                comments: {
                    userId: req.user.id,
                    comment,
                },
            },
        });
        res.redirect('/dashboard?success=Comment added');
    } catch (err) {
        console.error('Add comment error:', err.message || err);
        next(err);
    }
};

/**
 * Updates the completion date of an observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateCompletionDate = async (req, res, next) => {
    try {
        const { observationId, completionDate } = req.body;
        const observation = await Observation.findById(observationId);
        if (!observation || observation.vendorId.toString() !== req.user.id) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndUpdate(observationId, { completionDate });
        res.redirect('/dashboard?success=Completion date updated');
    } catch (err) {
        console.error('Update completion date error:', err.message || err);
        next(err);
    }
};

/**
 * Approves an observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const approveObservation = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const observation = await Observation.findById(observationId);
        const user = await User.findById(req.user.id);
        if (req.user.role !== 'eic' || observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndUpdate(observationId, { status: 'approved' });
        res.redirect('/dashboard?success=Observation approved');
    } catch (err) {
        console.error('Approve observation error:', err.message || err);
        next(err);
    }
};

/**
 * Rejects an observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const rejectObservation = async (req, res, next) => {
    try {
        const { observationId } = req.body;
        const observation = await Observation.findById(observationId);
        const user = await User.findById(req.user.id);
        if (req.user.role !== 'eic' || observation.eic !== user.name) {
            return res.redirect('/dashboard?error=Unauthorized');
        }

        await Observation.findByIdAndUpdate(observationId, { status: 'rejected' });
        res.redirect('/dashboard?success=Observation rejected');
    } catch (err) {
        console.error('Reject observation error:', err.message || err);
        next(err);
    }
};

/**
 * Reviews and forwards an observation to a Zone Leader.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

        observation.status = 'under_review';
        observation.forwardedBy = user.name;
        observation.forwardedAt = new Date();
        await observation.save();
        res.redirect('/dashboard?success=Observation sent to Zone Leader for review');
    } catch (err) {
        handleError(err, res, '/dashboard', 'Review and forward error:');
    }
};

/**
 * Resolves an observation by a vendor.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

        observation.status = 'forwarded';
        observation.comments.push({
            userId: user._id,
            comment: 'Issue marked as resolved by Vendor',
            createdAt: new Date(),
        });
        await observation.save();
        res.redirect('/dashboard?success=Issue marked as resolved');
    } catch (err) {
        handleError(err, res, '/dashboard', 'Resolve observation error:');
    }
};

/**
 * Closes an observation by a Zone Leader.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

        const normalUser = await User.findById(observation.userId);
        observation.comments.push({
            userId: user._id,
            comment: `Issue closed by Zone Leader. Status updated for ${normalUser.name}.`,
            createdAt: new Date(),
        });
        await observation.save();

        res.redirect('/dashboard?success=Observation closed successfully');
    } catch (err) {
        handleError(err, res, '/dashboard', 'Zone Leader close observation error:');
    }
};

/**
 * Resends an observation to a vendor by a Zone Leader.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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
            createdAt: new Date(),
        });
        await observation.save();

        res.redirect('/dashboard?success=Observation resent to Vendor');
    } catch (err) {
        handleError(err, res, '/dashboard', 'Zone Leader resend to vendor error:');
    }
};

module.exports = {
    forwardToVendor,
    closeObservation,
    addComment,
    updateCompletionDate,
    approveObservation,
    rejectObservation,
    reviewAndForwardToZoneLeader,
    resolveObservation,
    zoneLeaderCloseObservation,
    zoneLeaderResendToVendor,
};