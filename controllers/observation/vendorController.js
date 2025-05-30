/**
 * Vendor Controller
 * Handles vendor-specific operations such as submitting work.
 */

const Observation = require('../../models/Observation');
const cloudinary = require('../../config/cloudinary');
const { handleError } = require('./utils');

/**
 * Renders the vendor submission form.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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
        console.error('Render vendor submission form error:', err.message || err);
        next(err);
    }
};

/**
 * Submits vendor work for an observation.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const submitVendorWork = async (req, res, next) => {
    try {
        const { observationId, description } = req.body;
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
                        allowed_formats: ['pdf', 'jpeg', 'jpg', 'doc', 'docx'],
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
                    fileUrl,
                },
            },
        });

        res.redirect('/dashboard?success=Work submitted successfully');
    } catch (err) {
        console.error('Submit vendor work error:', err.message || err);
        next(err);
    }
};

module.exports = { renderVendorSubmissionForm, submitVendorWork };