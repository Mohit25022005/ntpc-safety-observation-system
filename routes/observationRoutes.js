const express = require('express');
const multer = require('multer');
const validateForm = require('../middleware/validateForm');
const { authMiddleware, authorizeRole } = require('../middleware/auth');
const {
    renderForm,
    getEICOptions,
    getDepartments,
    submitObservation,
    renderDashboard,
    forwardToVendor,
    closeObservation,
    addComment,
    updateCompletionDate,
    approveObservation,
    rejectObservation
} = require('../controllers/observationController');
const { zones, eicList, departments } = require('../config/constants');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const fileTypes = /pdf|jpeg|jpg|doc|docx/;
        console.log('Uploaded file mimetype:', file.mimetype); // Debug log
        const extname = fileTypes.test(file.mimetype.toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only PDF, JPEG, JPG, DOC, and DOCX files are allowed'));
    }
});

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message) {
        return res.redirect(`/?error=${encodeURIComponent(err.message)}`);
    }
    next(err);
};

router.get('/', authMiddleware, authorizeRole(['normal', 'zone_leader']), (req, res) => {
    const successMessage = req.query.success || null;
    const errorMessage = req.query.error || null;
    renderForm(req, res, { zones, eicList, departments, successMessage, errorMessage });
});

router.get('/dashboard', authMiddleware, renderDashboard);
router.get('/eic-options', authMiddleware, getEICOptions);
router.get('/departments', authMiddleware, getDepartments);
router.post('/submit', authMiddleware, authorizeRole(['normal', 'zone_leader']), upload.single('document'), handleMulterError, validateForm, submitObservation);
router.post('/forward', authMiddleware, authorizeRole(['eic', 'zone_leader']), forwardToVendor);
router.post('/close', authMiddleware, authorizeRole(['eic']), closeObservation);
router.post('/comment', authMiddleware, authorizeRole(['zone_leader']), addComment);
router.post('/update-date', authMiddleware, authorizeRole(['vendor']), updateCompletionDate);
router.post('/approve', authMiddleware, authorizeRole(['eic']), approveObservation);
router.post('/reject', authMiddleware, authorizeRole(['eic']), rejectObservation);

module.exports = router;