const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/system', analyticsController.getSystemAnalytics);

module.exports = router;