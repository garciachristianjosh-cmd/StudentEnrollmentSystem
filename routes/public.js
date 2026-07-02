const express            = require('express');
const router             = express.Router();
const applicantController = require('../controllers/applicantController');

router.get('/apply',  applicantController.getApplyForm);
router.post('/apply', applicantController.postApply);

module.exports = router;