const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacy.controller');

// Get pharmacy inventory
router.get('/:pharmacyId/inventory', pharmacyController.getPharmacyInventory);

// Update medicine stock
router.put('/:pharmacyId/medicines/:medicineId', pharmacyController.updateMedicineStock);

module.exports = router;