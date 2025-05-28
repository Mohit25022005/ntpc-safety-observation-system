const express = require('express');
const multer = require('multer');
const validateForm = require('../middleware/validateForm');
const { renderForm, getEICOptions, getDepartments, submitObservation } = require('../controllers/observationController');
const { zones, eicList, departments } = require('../config/constants');

const router = express.Router();

// Configure Multer to store files in memory (for Cloudinary upload)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const fileTypes = /pdf|jpeg|jpg|doc|docx/;
        const extname = fileTypes.test(file.mimetype.toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only PDF, JPEG, JPG, DOC, and DOCX files are allowed'));
    }
});

// Pass zones, eicList, and departments directly to renderForm
router.get('/', (req, res) => renderForm(req, res, { zones, eicList, departments }));
router.get('/eic-options', getEICOptions);
router.get('/departments', getDepartments);
router.post('/submit', upload.single('document'), validateForm, submitObservation);

module.exports = router;