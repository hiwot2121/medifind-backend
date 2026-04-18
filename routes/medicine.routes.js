const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');

// Search medicines
router.get('/search', medicineController.searchMedicines);

// Emergency search
router.post('/emergency', medicineController.emergencySearch);

module.exports = router;