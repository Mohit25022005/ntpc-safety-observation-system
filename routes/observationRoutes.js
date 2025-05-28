const express = require('express');
const multer = require('multer');
const validateForm = require('../middleware/validateForm');
const { renderForm, getEICOptions, getDepartments, submitObservation } = require('../controllers/observationController');
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

router.get('/', (req, res) => {
    const successMessage = req.query.success || null;
    const errorMessage = req.query.error || null;
    renderForm(req, res, { zones, eicList, departments, successMessage, errorMessage });
});
router.get('/eic-options', getEICOptions);
router.get('/departments', getDepartments);

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message) {
        return res.redirect(`/?error=${encodeURIComponent(err.message)}`);
    }
    next(err);
};

router.post('/submit', upload.single('document'), handleMulterError, validateForm, submitObservation);

module.exports = router;