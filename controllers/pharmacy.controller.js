const { db } = require('../config/firebase.config');
const { COLLECTIONS } = require('../config/constants');

// Get pharmacy inventory
exports.getPharmacyInventory = async (req, res) => {
  try {
    const { pharmacyId } = req.params;
    
    // Get pharmacy info
    const pharmacyDoc = await db.collection(COLLECTIONS.PHARMACIES).doc(pharmacyId).get();
    
    if (!pharmacyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found'
      });
    }
    
    // Get all medicines for this pharmacy
    const medicinesSnapshot = await db
      .collection(COLLECTIONS.PHARMACIES)
      .doc(pharmacyId)
      .collection(COLLECTIONS.MEDICINES)
      .get();
    
    const inventory = [];
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    medicinesSnapshot.forEach(doc => {
      const medicine = doc.data();
      medicine.id = doc.id;
      
      // Calculate medicine value
      const medicineValue = medicine.price * medicine.stock;
      totalValue += medicineValue;
      
      // Check stock levels
      if (medicine.stock === 0) {
        outOfStockCount++;
      } else if (medicine.stock < 10) {
        lowStockCount++;
      }
      
      inventory.push(medicine);
    });
    
    const pharmacy = pharmacyDoc.data();
    
    return res.json({
      success: true,
      pharmacy: {
        id: pharmacyId,
        name: pharmacy.name,
        address: pharmacy.address,
        contact: pharmacy.contact
      },
      inventory: {
        totalItems: inventory.length,
        totalValue: totalValue.toFixed(2),
        lowStockCount,
        outOfStockCount,
        items: inventory
      },
      summary: {
        averagePrice: inventory.length > 0 ? 
          (totalValue / inventory.reduce((sum, med) => sum + med.stock, 0)).toFixed(2) : 0,
        mostExpensive: inventory.length > 0 ? 
          Math.max(...inventory.map(m => m.price)) : 0,
        cheapest: inventory.length > 0 ? 
          Math.min(...inventory.filter(m => m.stock > 0).map(m => m.price)) : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting pharmacy inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get pharmacy inventory'
    });
  }
};

// Update medicine stock
exports.updateMedicineStock = async (req, res) => {
  try {
    const { pharmacyId, medicineId } = req.params;
    const { stock, price } = req.body;
    
    if (!stock && !price) {
      return res.status(400).json({
        success: false,
        message: 'Please provide stock or price to update'
      });
    }
    
    const updateData = {
      lastUpdated: new Date()
    };
    
    if (stock !== undefined) {
      updateData.stock = parseInt(stock);
      if (updateData.stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock cannot be negative'
        });
      }
    }
    
    if (price !== undefined) {
      updateData.price = parseFloat(price);
      if (updateData.price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price cannot be negative'
        });
      }
    }
    
    // Update the medicine
    const medicineRef = db
      .collection(COLLECTIONS.PHARMACIES)
      .doc(pharmacyId)
      .collection(COLLECTIONS.MEDICINES)
      .doc(medicineId);
    
    await medicineRef.update(updateData);
    
    // Get updated medicine
    const updatedDoc = await medicineRef.get();
    
    return res.json({
      success: true,
      message: 'Medicine updated successfully',
      medicine: {
        id: medicineId,
        ...updatedDoc.data(),
        lastUpdated: updateData.lastUpdated
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating medicine:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update medicine'
    });
  }
};