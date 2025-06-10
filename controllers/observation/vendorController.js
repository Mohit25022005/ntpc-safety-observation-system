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
// Render the vendor submission form
async function renderVendorSubmissionForm(req, res) {
    try {
        const observationId = req.params.id;
        if (!observationId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`Invalid observation ID format: ${observationId}`);
            return res.status(400).render('vendor_submission', {
                observation: null,
                user: req.user,
                errorMessage: 'Invalid observation ID format.'
            });
        }

        const observation = await Observation.findById(observationId);
        if (!observation) {
            console.error(`Observation not found for ID: ${observationId}`);
            return res.status(404).render('vendor_submission', {
                observation: null,
                user: req.user,
                errorMessage: `Observation not found.`
            });
        }

        if (req.user.role !== 'vendor' || !observation.vendorId || observation.vendorId.toString() !== req.user.id) {
            console.error(`Unauthorized vendor attempt: user ${req.user.id}, observation ${observationId}`);
            return res.status(403).render('vendor_submission', {
                observation,
                user: req.user,
                errorMessage: 'You are not authorized to submit work.'
            });
        }

        if (observation.status !== 'forwarded') {
            console.error(`Invalid status: ${observation.status}, observation ${observationId}`);
            return res.status(403).render('vendor_submission', {
                observation,
                user: req.user,
                errorMessage: 'Observation not available for submissions.'
            });
        }

        res.render('vendor_submission', { observation, user: req.user, errorMessage: null });
    } catch (error) {
        console.error(`Render vendor submission error for ID ${req.params.id}:`, error.message);
        res.status(500).render('vendor_submission', {
            observation: null,
            user: req.user,
            errorMessage: 'Server error. Please try again.'
        });
    }
}

async function submitVendorWork(req, res) {
    try {
        const { description } = req.body;
        const observationId = req.params.id;

        // Log incoming request
        console.log(`Submitting work for observation ${observationId} by user ${req.user?.id}`);

        // Validate observation ID
        if (!observationId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`Invalid observation ID format: ${observationId}`);
            return res.status(400).render('vendor_submission', {
                observation: null,
                user: req.user,
                errorMessage: 'Invalid observation ID format.'
            });
        }

        // Find observation
        const observation = await Observation.findById(observationId);
        if (!observation) {
            console.error(`Observation not found for ID: ${observationId}`);
            return res.status(404).render('vendor_submission', {
                observation: null,
                user: req.user,
                errorMessage: `Observation not found.`
            });
        }

        // Validate vendor authorization
        if (req.user.role !== 'vendor' || !observation.vendorId || observation.vendorId.toString() !== req.user.id) {
            console.error(`Unauthorized vendor attempt: user ${req.user.id}, observation ${observationId}`);
            return res.status(403).render('vendor_submission', {
                observation,
                user: req.user,
                errorMessage: 'You are not authorized to submit work.'
            });
        }

        // Check status
        if (observation.status !== 'forwarded') {
            console.error(`Invalid status: ${observation.status}, observation ${observationId}`);
            return res.status(403).render('vendor_submission', {
                observation,
                user: req.user,
                errorMessage: 'Observation not available for submissions.'
            });
        }

        // Handle file upload
        let fileUrl = null;
        if (req.file) {
            try {
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
                console.log(`File uploaded to Cloudinary: ${fileUrl}`);
            } catch (uploadError) {
                console.error(`File upload error for observation ${observationId}:`, uploadError.message);
                return res.status(500).render('vendor_submission', {
                    observation,
                    user: req.user,
                    errorMessage: 'Failed to upload file. Please try again or submit without a file.'
                });
            }
        }

        // Add submission
        observation.submissions.push({
            vendorId: req.user.id,
            description: description || 'No description provided',
            fileUrl,
            createdAt: new Date()
        });
        observation.status = 'under_review';
        await observation.save();

        console.log(`Submission added for observation ${observationId} by vendor ${req.user.id}`);
        res.redirect(`/issue/${observationId}?success=Work submitted successfully`);
    } catch (error) {
        console.error(`Submit vendor work error for ID ${req.params.id}:`, error.message, error.stack);
        res.status(500).render('vendor_submission', {
            observation: await Observation.findById(req.params.id).catch(() => null),
            user: req.user,
            errorMessage: 'Failed to submit work. Please try again.'
        });
    }
}
module.exports = { renderVendorSubmissionForm, submitVendorWork };