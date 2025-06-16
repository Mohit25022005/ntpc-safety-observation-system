const express = require('express');
const multer = require('multer');
const { authMiddleware, authorizeRole } = require('../middleware/auth');
const {
    renderForm,
    getZoneLeaders,
    getDepartments,
    getEICOptions,
    renderNearMissForm,
    submitNearMiss,
    viewNearMissDetails
} = require('../controllers/observation/formController');
const {
    submitObservation,
    renderDashboard,
    editObservation,
    updateObservation,
    deleteObservation,
    forwardToVendor,
    closeObservation,
    addComment,
    updateCompletionDate,
    approveObservation,
    rejectObservation,
    renderVendorSubmissionForm,
    submitVendorWork,
    viewIssueDetails,
    reviewAndForwardToZoneLeader,
    resolveObservation,
    zoneLeaderCloseObservation,
    zoneLeaderResendToVendor,
    handleObservationCountSSE,
    renderForwardForm
} = require('../controllers/observationController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Core form & dropdown APIs
router.get('/', authMiddleware, renderForm);
router.get('/zone-leaders', authMiddleware, getZoneLeaders);
router.get('/departments', authMiddleware, getDepartments);
router.get('/eic-options', authMiddleware, getEICOptions);

// Near miss form
router.get('/report-near-miss', authMiddleware, renderNearMissForm);
router.post('/report-near-miss/submit', authMiddleware, upload.single('incidentFile'), submitNearMiss);
router.get('/near-miss/:id', authMiddleware, viewNearMissDetails);

// SSE for observation count
router.get('/observation-count', authMiddleware, handleObservationCountSSE);

// Observation submission
router.post('/submit', authMiddleware, upload.single('file'), submitObservation);
router.get('/dashboard', authMiddleware, renderDashboard);

// Observation update & delete
router.get('/observation/edit/:id', authMiddleware, editObservation);
router.post('/observation/update/:id', authMiddleware, upload.single('file'), updateObservation);
router.post('/observation/delete/:id', authMiddleware, deleteObservation);

// Action routes
router.get('/observation/forward/:id', authMiddleware, authorizeRole(['zone_leader', 'eic']), renderForwardForm);
router.post('/forward', authMiddleware, authorizeRole(['zone_leader', 'eic']), forwardToVendor);
router.post('/close', authMiddleware, closeObservation);
router.post('/comment', authMiddleware, addComment);
router.post('/update-date', authMiddleware, updateCompletionDate);
router.post('/approve', authMiddleware, approveObservation);
router.post('/reject', authMiddleware, rejectObservation);

// Vendor submission
router.get('/vendor/submit/:id', authMiddleware, renderVendorSubmissionForm);
router.post('/vendor/submit/:id', authMiddleware, upload.single('file'), submitVendorWork);
router.post('/vendor/resolve', authMiddleware, resolveObservation);

// Issue review and zone leader routes
router.get('/issue/:id', authMiddleware, viewIssueDetails);
router.post('/review-and-forward-to-zone-leader', authMiddleware, reviewAndForwardToZoneLeader);
router.post('/zone-leader/close', authMiddleware, zoneLeaderCloseObservation);
router.post('/zone-leader/resend-to-vendor', authMiddleware, zoneLeaderResendToVendor);

// Placeholder routes for sidebar links
router.get('/record-suggestion', authMiddleware, (req, res) => res.render('placeholder', { user: req.user, message: 'Record Suggestion - Under Construction' }));
router.get('/submit-poster', authMiddleware, (req, res) => res.render('placeholder', { user: req.user, message: 'Submit Poster/Slogan - Under Construction' }));
router.get('/safety-policy', authMiddleware, (req, res) => res.render('placeholder', { user: req.user, message: 'NTPC Safety Policy Compliance - Under Construction' }));
router.get('/safety-permit', authMiddleware, (req, res) => res.render('placeholder', { user: req.user, message: 'Safety Permit - Under Construction' }));
router.get('/safety-admin', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/dashboard?error=Unauthorized');
    res.render('placeholder', { user: req.user, message: 'Safety Admin - Under Construction' });
});

module.exports = router;