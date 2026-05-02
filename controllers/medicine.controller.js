const { db } = require('../config/firebase.config');
const { COLLECTIONS } = require('../config/constants');

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 1. SEARCH MEDICINES
exports.searchMedicines = async (req, res) => {
  try {
    const { q, lat, lng, radius = 5, lang = 'en' } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }
    
    console.log(`🔍 Searching for: "${q}"`);
    
    // Get all verified pharmacies
    const pharmaciesSnapshot = await db.collection(COLLECTIONS.PHARMACIES)
      .where('verified', '==', true)
      .get();
    
    if (pharmaciesSnapshot.empty) {
      return res.json({
        success: true,
        message: 'No pharmacies found',
        results: [],
        count: 0
      });
    }
    
    let results = [];
    const searchTerm = q.toLowerCase().trim();
    
    // Check each pharmacy
    for (const pharmacyDoc of pharmaciesSnapshot.docs) {
      const pharmacy = pharmacyDoc.data();
      const pharmacyId = pharmacyDoc.id;
      
      // Calculate distance if coordinates provided
      let distance = null;
      if (lat && lng && pharmacy.location) {
        distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          pharmacy.location.latitude,
          pharmacy.location.longitude
        );
        
        // Skip pharmacies outside search radius
        if (distance > parseFloat(radius)) {
          continue;
        }
      }
      
      try {
        // Search medicines in this pharmacy
        const medicinesSnapshot = await db
          .collection(COLLECTIONS.PHARMACIES)
          .doc(pharmacyId)
          .collection(COLLECTIONS.MEDICINES)
          .get();
        
        medicinesSnapshot.forEach(medDoc => {
          const medicine = medDoc.data();
          
          // Check if medicine matches search term
          const nameMatch = medicine.name?.toLowerCase().includes(searchTerm);
          const genericMatch = medicine.genericName?.toLowerCase().includes(searchTerm);
          const amharicMatch = medicine.amharicName?.toLowerCase().includes(searchTerm);
          
          if (nameMatch || genericMatch || (lang === 'am' && amharicMatch)) {
            // Check if medicine is in stock
            if (medicine.stock > 0) {
              results.push({
                id: medDoc.id,
                name: lang === 'am' && medicine.amharicName ? medicine.amharicName : medicine.name,
                genericName: medicine.genericName,
                dosage: medicine.dosage,
                price: medicine.price,
                stock: medicine.stock,
                requiresPrescription: medicine.requiresPrescription || false,
                pharmacyId: pharmacyId,
                pharmacyName: pharmacy.name,
                pharmacyAddress: pharmacy.address,
                pharmacyLocation: pharmacy.location,
                distance: distance ? `${distance.toFixed(1)} km` : 'Distance not available',
                lastUpdated: medicine.lastUpdated?.toDate().toISOString() || new Date().toISOString()
              });
            }
          }
        });
      } catch (error) {
        console.error(`Error searching in pharmacy ${pharmacyId}:`, error);
        continue;
      }
    }
    
    // Sort by distance if coordinates provided
    if (lat && lng) {
      results.sort((a, b) => {
        // Extract numeric distance from string
        const distA = a.distance.includes('km') ? 
          parseFloat(a.distance.replace(' km', '')) : Infinity;
        const distB = b.distance.includes('km') ? 
          parseFloat(b.distance.replace(' km', '')) : Infinity;
        return distA - distB;
      });
    }
    
    return res.json({
      success: true,
      message: 'Search completed successfully',
      query: q,
      language: lang,
      count: results.length,
      results: results,
      metadata: {
        timestamp: new Date().toISOString(),
        pharmaciesSearched: pharmaciesSnapshot.size,
        searchRadius: `${radius} km`
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching medicines:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search medicines',
      error: error.message
    });
  }
};

// 2. EMERGENCY SEARCH
exports.emergencySearch = async (req, res) => {
  try {
    const { medicineName, patientLocation, urgencyLevel = 'high' } = req.body;
    
    if (!medicineName || !patientLocation) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name and patient location are required for emergency search'
      });
    }
    
    console.log(`🚨 EMERGENCY SEARCH for: ${medicineName}`);
    
    // Get all pharmacies within 10km
    const pharmaciesSnapshot = await db.collection(COLLECTIONS.PHARMACIES)
      .where('verified', '==', true)
      .get();
    
    const emergencyResults = [];
    const broadcastList = [];
    
    // Check each pharmacy within 10km radius
    for (const pharmacyDoc of pharmaciesSnapshot.docs) {
      const pharmacy = pharmacyDoc.data();
      const pharmacyId = pharmacyDoc.id;
      
      // Calculate distance
      if (pharmacy.location) {
        const distance = calculateDistance(
          patientLocation.latitude,
          patientLocation.longitude,
          pharmacy.location.latitude,
          pharmacy.location.longitude
        );
        
        if (distance <= 10) { // Within 10km radius
          broadcastList.push({
            pharmacyId: pharmacyId,
            pharmacyName: pharmacy.name,
            distance: distance.toFixed(1)
          });
          
          // Check if this pharmacy has the medicine
          const medicinesSnapshot = await db
            .collection(COLLECTIONS.PHARMACIES)
            .doc(pharmacyId)
            .collection(COLLECTIONS.MEDICINES)
            .where('name', '>=', medicineName)
            .where('name', '<=', medicineName + '\uf8ff')
            .where('stock', '>', 0)
            .get();
          
          if (!medicinesSnapshot.empty) {
            medicinesSnapshot.forEach(medDoc => {
              const medicine = medDoc.data();
              emergencyResults.push({
                pharmacyId: pharmacyId,
                pharmacyName: pharmacy.name,
                medicineId: medDoc.id,
                medicineName: medicine.name,
                stock: medicine.stock,
                price: medicine.price,
                distance: `${distance.toFixed(1)} km`,
                responseTime: 'Immediate',
                coordinates: pharmacy.location
              });
            });
          }
        }
      }
    }
    
    // Create emergency request record
    const emergencyRequest = {
      medicineName,
      patientLocation,
      urgencyLevel,
      broadcastTo: broadcastList,
      responses: emergencyResults,
      status: 'broadcasted',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };
    
    // Save to database
    await db.collection(COLLECTIONS.EMERGENCY_REQUESTS).add(emergencyRequest);
    
    // Sort by distance for fastest response
    emergencyResults.sort((a, b) => {
      const distA = parseFloat(a.distance.replace(' km', ''));
      const distB = parseFloat(b.distance.replace(' km', ''));
      return distA - distB;
    });
    
    return res.json({
      success: true,
      message: 'Emergency search completed',
      urgencyLevel,
      pharmaciesBroadcasted: broadcastList.length,
      availableStockFound: emergencyResults.length,
      fastestOptions: emergencyResults.slice(0, 3), // Top 3 closest
      allOptions: emergencyResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Emergency search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Emergency search failed',
      error: error.message
    });
  }
};