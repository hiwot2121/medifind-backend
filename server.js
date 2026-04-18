const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config();

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ========== CHAPA PAYMENT SERVICE ==========
class ChapaService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY;
    this.baseUrl = process.env.CHAPA_API_URL || "https://api.chapa.co/v1";
    this.mode = process.env.CHAPA_MODE || "test";
  }

  async initializePayment(paymentData) {
  try {
    const shortPharmacyId = (paymentData.pharmacyId || 'unknown').substr(0, 8);
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4);
    const tx_ref = `MF_${shortPharmacyId}_${timestamp}_${random}`;
    
    console.log('📝 Generated tx_ref:', tx_ref, '(length:', tx_ref.length, 'chars)');

    const payload = {
      amount: paymentData.amount,
      currency: "ETB",
      email: paymentData.email,
      first_name: paymentData.firstName || "Customer",
      last_name: paymentData.lastName || "Name",
      phone_number: paymentData.phone || "0912345678",
      tx_ref: tx_ref,
      callback_url: `${process.env.BASE_URL || "http://localhost:5000"}/api/payments/callback`,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/pharmacy/payment-status`,
      customization: {
        title: "MediFind Payment",
        description: this.mode === "test" ? "TEST MODE - No real money" : paymentData.description
      }
    };

    console.log(`💰 Initializing ${this.mode} payment:`, payload.amount, "ETB");

    const response = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    console.log('📡 Chapa response status:', response.data.status);
    
    // Log the FULL response to debug
    console.log('📡 Full Chapa response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === "success") {
      // Try different possible paths to get data
      const data = response.data.data || response.data;
      const checkoutUrl = data.checkout_url || data.checkoutUrl;
      const returnedTxRef = data.tx_ref || data.reference || tx_ref;
      
      console.log('📝 Extracted checkoutUrl:', checkoutUrl);
      console.log('📝 Extracted tx_ref:', returnedTxRef);
      
      return {
        success: true,
        checkoutUrl: checkoutUrl,
        reference: returnedTxRef,
        mode: this.mode
      };
    } else {
      throw new Error(response.data.message || "Payment failed");
    }
  } catch (error) {
    console.error("Chapa error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

  async verifyPayment(reference) {
    try {
      console.log('🔍 Calling Chapa verify API for:', reference);
      
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            "Authorization": `Bearer ${this.secretKey}`
          },
          timeout: 30000
        }
      );

      console.log('🔍 Chapa verify response data:', JSON.stringify(response.data, null, 2));

      // Check different possible response structures
      const data = response.data.data || response.data;
      const isSuccessful = data.status === 'success';
      
      return {
        success: isSuccessful,
        status: data.status || 'failed',
        amount: data.amount || 0,
        reference: reference,
        message: isSuccessful ? 'Payment verified successfully' : 'Payment not successful'
      };
    } catch (error) {
      console.error('Verify error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: 'failed',
        reference: reference
      };
    }
  }
}

const chapa = new ChapaService();

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   PATIENT – SEARCH MEDICINE
   ========================= */
app.get("/api/medicines", async (req, res) => {
  try {
    const { name, dosage } = req.query;

    let query = db.collection("medicines");

    if (name) query = query.where("name", "==", name);
    if (dosage) query = query.where("dosage", "==", dosage);

    const snapshot = await query.get();
    const medicines = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   PHARMACIST – ADD MEDICINE
   ========================= */
app.post("/api/medicines", async (req, res) => {
  try {
    const medicine = req.body;

    await db.collection("medicines").add({
      ...medicine,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Medicine added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   DELIVERY ORDER
   ========================= */
app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;

    await db.collection("orders").add({
      ...order,
      status: "Pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Order placed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ADMIN – GET ALL ORDERS
   ========================= */
app.get("/api/orders", async (req, res) => {
  try {
    const snapshot = await db.collection("orders").get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   CHAPA PAYMENT ROUTES
   ========================= */

// Initialize payment - call this from frontend
app.post("/api/payments/initiate", async (req, res) => {
  const { amount, email, phone, firstName, lastName, itemName, pharmacyId } = req.body;

  console.log('📥 Payment initiation request:', { amount, email, pharmacyId });

  if (!amount || !email) {
    return res.status(400).json({
      success: false,
      error: "Amount and email are required"
    });
  }

  try {
    const result = await chapa.initializePayment({
      amount: parseFloat(amount),
      email: email,
      phone: phone,
      firstName: firstName || "Customer",
      lastName: lastName || "Name",
      description: itemName || "MediFind Payment",
      pharmacyId: pharmacyId
    });

    console.log('📤 Payment initiation result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Payment initiation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Payment initialization failed"
    });
  }
});

// Verify payment - check if payment was successful
app.get("/api/payments/verify/:reference", async (req, res) => {
  const { reference } = req.params;
  console.log('🔍 Verify endpoint called for:', reference);
  const result = await chapa.verifyPayment(reference);
  console.log('📤 Verify result:', result);
  res.json(result);
});

// ========== CHAPA WEBHOOK - SAVES PAYMENT TO DATABASE ==========
app.post("/api/payments/chapa-webhook", async (req, res) => {
  console.log("📞 Chapa webhook received:", req.body);
  
  const { tx_ref, status, amount, email } = req.body;
  
  if (status === 'success') {
    try {
      // Extract pharmacyId from shortened tx_ref (format: MF_pharmacyId_timestamp_random)
      const parts = tx_ref.split('_');
      const shortPharmacyId = parts[1];
      
      console.log(`✅ Processing successful payment for short pharmacy ID: ${shortPharmacyId}`);
      
      // Find the full pharmacy ID by matching the start
      let fullPharmacyId = null;
      let pharmacyData = null;
      
      const pharmaciesSnapshot = await db.collection('pharmacies').get();
      for (const doc of pharmaciesSnapshot.docs) {
        if (doc.id.startsWith(shortPharmacyId)) {
          fullPharmacyId = doc.id;
          pharmacyData = doc.data();
          break;
        }
      }
      
      if (!pharmacyData) {
        console.error(`Pharmacy not found for short ID: ${shortPharmacyId}`);
        return res.json({ received: true, error: 'Pharmacy not found' });
      }
      
      console.log(`✅ Found pharmacy: ${pharmacyData.name} (${fullPharmacyId})`);
      
      // Determine plan type from amount
      let planType = 'monthly';
      if (amount === 1425) planType = 'quarterly';
      else if (amount === 5100) planType = 'annual';
      
      // Save payment to database
      const paymentData = {
        pharmacyId: fullPharmacyId,
        pharmacyName: pharmacyData.name || 'Unknown',
        amount: parseFloat(amount),
        planType: planType,
        paymentMethod: 'chapa',
        status: 'approved',
        transactionId: tx_ref,
        paymentDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        verifiedBy: 'Chapa Auto'
      };
      
      await db.collection('subscription_payments').add(paymentData);
      console.log('✅ Chapa payment saved to database');
      
      // Update or create subscription
      const subscriptionQuery = await db.collection('subscriptions')
        .where('pharmacyId', '==', fullPharmacyId)
        .get();
      
      const newEndDate = new Date();
      let daysToAdd = 0;
      switch(planType) {
        case 'monthly': daysToAdd = 30; break;
        case 'quarterly': daysToAdd = 90; break;
        case 'annual': daysToAdd = 365; break;
        default: daysToAdd = 30;
      }
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);
      
      if (!subscriptionQuery.empty) {
        const subDoc = subscriptionQuery.docs[0];
        await db.collection('subscriptions').doc(subDoc.id).update({
          status: 'active',
          planType: planType,
          endDate: admin.firestore.Timestamp.fromDate(newEndDate),
          lastPaymentDate: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        });
        console.log('✅ Subscription updated');
      } else {
        await db.collection('subscriptions').add({
          pharmacyId: fullPharmacyId,
          pharmacyName: pharmacyData.name,
          planType: planType,
          status: 'active',
          startDate: admin.firestore.Timestamp.now(),
          endDate: admin.firestore.Timestamp.fromDate(newEndDate),
          lastPaymentDate: admin.firestore.Timestamp.now(),
          createdAt: admin.firestore.Timestamp.now()
        });
        console.log('✅ New subscription created');
      }
      
      // Update pharmacy status
      await db.collection('pharmacies').doc(fullPharmacyId).update({
        status: 'approved',
        isVerified: true,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      // Send notification to pharmacy
      await db.collection('pharmacy_notifications').add({
        pharmacyId: fullPharmacyId,
        type: 'payment_approved',
        title: '✅ Payment Successful!',
        message: `Your Chapa payment of ${amount} ETB for ${planType} plan has been confirmed. Your subscription is now active.`,
        isRead: false,
        createdAt: admin.firestore.Timestamp.now()
      });
      
      console.log('✅ Notification sent to pharmacy');
      
    } catch (error) {
      console.error('Error saving Chapa payment:', error);
    }
  } else {
    console.log(`⚠️ Payment not successful. Status: ${status}`);
  }
  
  res.json({ received: true });
});

// Callback endpoint - Chapa calls this automatically (legacy)
app.post("/api/payments/callback", async (req, res) => {
  console.log("📞 Payment callback received:", req.body);
  res.json({ received: true });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    mode: process.env.CHAPA_MODE || "test",
    timestamp: new Date().toISOString()
  });
});

/* =========================
   START SERVER
   ========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ MediFind backend running on port ${PORT}`);
  console.log(`💰 Chapa payment mode: ${process.env.CHAPA_MODE || "test"}`);
  console.log(`🔑 Chapa configured: ${process.env.CHAPA_SECRET_KEY ? "YES" : "NO"}`);
  console.log(`📡 Webhook endpoint: /api/payments/chapa-webhook`);
});