const { db, admin } = require('../config/firebase.config');
const { COLLECTIONS, ORDER_STATUS } = require('../config/constants');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { pharmacyId, medicines, deliveryInfo, paymentMethod = 'cash' } = req.body;
    
    // Basic validation
    if (!pharmacyId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacy ID and medicines array are required'
      });
    }
    
    console.log(`🛒 Creating order for pharmacy: ${pharmacyId}`);
    
    // Check pharmacy exists
    const pharmacyDoc = await db.collection(COLLECTIONS.PHARMACIES).doc(pharmacyId).get();
    if (!pharmacyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found'
      });
    }
    
    const pharmacy = pharmacyDoc.data();
    
    // Calculate order total and check stock
    let orderTotal = 0;
    const orderItems = [];
    
    for (const item of medicines) {
      if (!item.medicineId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each medicine must have an ID and positive quantity'
        });
      }
      
      const medicineDoc = await db
        .collection(COLLECTIONS.PHARMACIES)
        .doc(pharmacyId)
        .collection(COLLECTIONS.MEDICINES)
        .doc(item.medicineId)
        .get();
      
      if (!medicineDoc.exists) {
        return res.status(404).json({
          success: false,
          message: `Medicine ${item.medicineId} not found`
        });
      }
      
      const medicine = medicineDoc.data();
      
      // Check stock
      if (medicine.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`
        });
      }
      
      const itemTotal = medicine.price * item.quantity;
      orderTotal += itemTotal;
      
      orderItems.push({
        medicineId: item.medicineId,
        name: medicine.name,
        dosage: medicine.dosage,
        quantity: item.quantity,
        price: medicine.price,
        itemTotal: itemTotal
      });
    }
    
    // Add delivery fee if needed
    let deliveryFee = 0;
    if (deliveryInfo && deliveryInfo.required && pharmacy.services?.delivery) {
      deliveryFee = pharmacy.services.deliveryFee || 25;
    }
    
    const grandTotal = orderTotal + deliveryFee;
    
    // Create order document
    const orderRef = db.collection(COLLECTIONS.ORDERS).doc();
    const orderId = orderRef.id;
    
    const orderData = {
      id: orderId,
      pharmacyId,
      pharmacyName: pharmacy.name,
      items: orderItems,
      subtotal: orderTotal,
      deliveryFee,
      total: grandTotal,
      deliveryInfo: deliveryInfo || { required: false },
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'processing',
      status: ORDER_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await orderRef.set(orderData);
    
    // Update stock levels using Firebase FieldValue - NO BATCH!
    for (const item of medicines) {
      const medicineRef = db
        .collection(COLLECTIONS.PHARMACIES)
        .doc(pharmacyId)
        .collection(COLLECTIONS.MEDICINES)
        .doc(item.medicineId);
      
      // Use admin.firestore.FieldValue.increment
      await medicineRef.update({
        stock: admin.firestore.FieldValue.increment(-item.quantity),
        lastUpdated: new Date()
      });
    }
    
    console.log(`✅ Order created: ${orderId}, Total: ${grandTotal} ETB`);
    
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: orderData,
      summary: {
        itemsCount: orderItems.length,
        subtotal: `ETB ${orderTotal.toFixed(2)}`,
        deliveryFee: `ETB ${deliveryFee.toFixed(2)}`,
        total: `ETB ${grandTotal.toFixed(2)}`,
        estimatedDelivery: deliveryInfo?.required ? '60 minutes' : 'Immediate pickup'
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Get order by ID
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const orderDoc = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orderDoc.data();
    
    return res.json({
      success: true,
      order
    });
    
  } catch (error) {
    console.error('❌ Error getting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get order'
    });
  }
};