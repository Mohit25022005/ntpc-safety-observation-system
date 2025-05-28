const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const {
    renderForm,
    getZoneLeaders,
    getEICOptions,
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
    rejectObservation
} = require('../controllers/observationController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authMiddleware, renderForm);
router.get('/zone-leaders', authMiddleware, getZoneLeaders);
router.get('/eic-options', authMiddleware, getEICOptions);
router.get('/departments', authMiddleware, getDepartments);
router.post('/submit', authMiddleware, upload.single('file'), submitObservation);
router.get('/dashboard', authMiddleware, renderDashboard);
router.get('/observation/edit/:id', authMiddleware, editObservation);
router.post('/observation/update/:id', authMiddleware, upload.single('file'), updateObservation);
router.post('/observation/delete/:id', authMiddleware, deleteObservation);
router.post('/forward', authMiddleware, forwardToVendor);
router.post('/close', authMiddleware, closeObservation);
router.post('/comment', authMiddleware, addComment);
router.post('/update-date', authMiddleware, updateCompletionDate);
router.post('/approve', authMiddleware, approveObservation);
router.post('/reject', authMiddleware, rejectObservation);

module.exports = router;