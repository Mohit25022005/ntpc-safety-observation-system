const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const {
    renderForm,
    getZoneLeaders,
    getDepartments,
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
} = require('../controllers/observationController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Core form & dropdown APIs
router.get('/', authMiddleware, renderForm);
router.get('/zone-leaders', authMiddleware, getZoneLeaders);
router.get('/departments', authMiddleware, getDepartments);

// Observation submission
router.post('/submit', authMiddleware, upload.single('file'), submitObservation);
router.get('/dashboard', authMiddleware, renderDashboard);

// Observation update & delete
router.get('/observation/edit/:id', authMiddleware, editObservation);
router.post('/observation/update/:id', authMiddleware, upload.single('file'), updateObservation);
router.post('/observation/delete/:id', authMiddleware, deleteObservation);

// Action routes
router.post('/forward', authMiddleware, forwardToVendor);
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

module.exports = router;