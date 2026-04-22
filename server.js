const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config();

// ========== FIREBASE CONFIGURATION - HARDCODED ==========
const serviceAccount = {
  type: "service_account",
  project_id: "medifind-gondar-d27f7",
  private_key_id: "f2ed81e978bcf28917d16be051933beab550ae71",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDXbnijFT4FLO+p\n4m3TSsoGLiBVEVVZ/py/ureZgJh7W16av7hp4RS8SAMBvNb5gFNoD6/Uju0PHG5b\nTPOkKPYzuZAw9gwcZc2kBFfnJhvUldnre1OGjbzfgTUyfhlhL5b5NMHQqBUoreMB\n++zFaxlrtr/akwbV+oRjA0G8ugzj8YtDenkyyazKtXF47Y3Ll+NRD8X7R41AZECJ\nlOdu/b0K7BS/zWfBPZElR1ufRsJSv6Ih7VQ3FAmdn0MqiKEfONTYmF0HQKWcauo5\nTy5Js+iqW+ZUiBmQgQz8q36bNs26HUEuT6T3KuoOKm3ha3Ain5HpPHQNqRYqzN6n\nK/9op4GfAgMBAAECggEAKSv+uEQ+ByUwZIpWrPP1Kjs0iK14X2uur2HS5u5Rtfmf\nWfncF7ghi15D3NgnSaXByvh8hSYPnjyzxpUtVylQ7E/Bg+nyJJc8NuVxm0aIOReu\nfzehneyGtTxvW0gIN6+trdDsXaFR8eVRpjZsaMpwIErb3b0NqGVpWbbsoFH6VrGg\nNEu0K241K3oEBbTSLXS2prkh55f5ByIDzCiYH7thjt2ka9zUG7ENyfq+L3GGpiDn\nFcs0xe8rCgAoofGhDPhkZg57k5kVUTau10RJP2a22orbiJiNWBZVz2TskuGFiAIL\nFWNdOUyWFrHIiD9TMZvQSLZFKaK9CGSKWnFhrc906QKBgQD0ET00gNv25QVwl5vT\naR3jHZhCFZ0AblQLDwn/Nhn7Fj/pzdQ/QXqM2ttjj0Df2oMviLt9LkeuQ1nMITPw\nvbTDbj0wXEo8OFQdjM2JRjgCPPo3fk4/piGWA6+SVNBhkO62roOm+zwikJEpDgys\nZMUieSqFP3Zo+GTbVNmuVNLiswKBgQDh9tMeU/uOVWIudw84tpX1lY8B47ThK7Ag\nQmNpt8PyzNpf7vvrByrrX+7rSMnP6wLOEddDPHg1o5UacfQNjPXdkpprrhOEyzRV\nOokIdNHXZjadvY3gsDB09GQFIgl0+tBqv5k/7Xc5EKkqdWTd7OymFMxMn3nkqn6v\nZhyulSArZQKBgDZhKOvr0ha+jGm7veJqx1f1HhmLS0HvUxZrsWSFn2BMYs0rKSE2\n66E6misinefCffw3UN7hUuNG6lkLBNGc0wvAIi4GQhwMyOEUoC730D7fazi2EaUo\n1M7h31qRPySd8DIPzBGGZK2m3FDzamt2wF2f9ZNewnk87uvXifDHwXz1AoGAB2jV\nkWgFlqw8FPP4fs6V6kCmONSjqMKK+vPSWLQa68pF2uF2R0Wr5Z32sqZnX7cAF4vE\nOEMyWefsSrqz2wHlSge1opRJtZAIPkc2GR3jh6GlZtTBYz3DyQH+iaCNGNXkoat4\ntfzubOOb+HVzAkfzlpqV/Gk6UQI6Nzws8piXPnUCgYB1trGVs1ML95sB/WqoFzfg\nNaUQCLPePVhNlICRYa81w7/s2E45+ZDqgROeDmRv1kXro7SaxhgXc0nVebGMj/7z\nt5D9SCUpBb/4Cbt7eGzl7ZJU+sVdHu912nBjDYn9fKM/5u4OZRdwVRcYs3duQl+A\nZOgmxwIDpLY8eF5Yg8hmEQ==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@medifind-gondar-d27f7.iam.gserviceaccount.com",
  client_id: "101419702510438472859",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40medifind-gondar-d27f7.iam.gserviceaccount.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ========== CHAPA PAYMENT SERVICE ==========
class ChapaService {
  constructor() {
    this.secretKey = "CHASECK_TEST-J8HK5CLTYaGbDpHbfIfKWMlt20aXylN6";
    this.baseUrl = "https://api.chapa.co/v1";
    this.mode = "test";
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
        callback_url: `https://medifind-backend-0raf.onrender.com/api/payments/callback`,
        return_url: `https://medifind-gondar-d27f7.web.app/pharmacy/payment-status`,
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
      console.log('📡 Full Chapa response:', JSON.stringify(response.data, null, 2));

      if (response.data.status === "success") {
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

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    mode: "test",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "MediFind Backend API is running!",
    status: "online",
    endpoints: {
      health: "/health",
      payments: "/api/payments/initiate",
      callback: "/api/payments/callback",
      verify: "/api/payments/verify/:reference"
    }
  });
});

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

app.get("/api/payments/verify/:reference", async (req, res) => {
  const { reference } = req.params;
  console.log('🔍 Verify endpoint called for:', reference);
  const result = await chapa.verifyPayment(reference);
  console.log('📤 Verify result:', result);
  res.json(result);
});

// ========== CALLBACK ENDPOINT - FIXED FOR ALL AMOUNTS ==========
app.get("/api/payments/callback", async (req, res) => {
  console.log("📞 Payment callback received (GET):", req.query);
  
  const { trx_ref, status, ref_id } = req.query;
  const tx_ref = trx_ref;
  
  console.log(`🔍 Extracted: tx_ref=${tx_ref}, status=${status}`);
  
  if (status === 'success' && tx_ref) {
    try {
      // Fetch correct amount from Chapa
      const verifyResponse = await axios.get(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
          headers: {
            "Authorization": `Bearer ${this.secretKey}`
          }
        }
      );
      
      let correctAmount = verifyResponse.data.data?.amount;
      console.log(`💰 Raw amount from Chapa API: ${correctAmount}`);
      
      // Convert to number if it's a string
      if (typeof correctAmount === 'string') {
        correctAmount = parseFloat(correctAmount);
      }
      
      console.log(`💰 Parsed amount: ${correctAmount}`);
      
      if (!correctAmount || isNaN(correctAmount)) {
        console.error(`❌ Could not fetch valid amount from Chapa`);
        return res.json({ received: true, error: 'Could not fetch amount' });
      }
      
      // Flexible plan type detection using ranges
      let planType = 'monthly';
      let daysToAdd = 30;
      
      if (correctAmount >= 1400 && correctAmount <= 1450) {
        planType = 'quarterly';
        daysToAdd = 90;
        console.log(`✅ Detected QUARTERLY plan (amount: ${correctAmount})`);
      } else if (correctAmount >= 5000 && correctAmount <= 5200) {
        planType = 'annual';
        daysToAdd = 365;
        console.log(`✅ Detected ANNUAL plan (amount: ${correctAmount})`);
      } else {
        console.log(`✅ Detected MONTHLY plan (amount: ${correctAmount})`);
      }
      
      const parts = tx_ref.split('_');
      const shortPharmacyId = parts[1];
      
      console.log(`🔍 Looking for pharmacy with ID starting with: ${shortPharmacyId}`);
      
      const pharmaciesSnapshot = await db.collection('pharmacies').get();
      
      let fullPharmacyId = null;
      let pharmacyData = null;
      
      for (const doc of pharmaciesSnapshot.docs) {
        if (doc.id.startsWith(shortPharmacyId)) {
          fullPharmacyId = doc.id;
          pharmacyData = doc.data();
          console.log(`✅ Found pharmacy: ${pharmacyData.name}`);
          break;
        }
      }
      
      if (!pharmacyData) {
        console.error(`❌ Pharmacy not found`);
        return res.json({ received: true, error: 'Pharmacy not found' });
      }
      
      console.log(`📋 Plan: ${planType}, Days: ${daysToAdd}, Amount: ${correctAmount}`);
      
      // SAVE TO DATABASE
      const paymentData = {
        pharmacyId: fullPharmacyId,
        pharmacyName: pharmacyData.name || 'Unknown',
        amount: correctAmount,
        planType: planType,
        paymentMethod: 'chapa',
        status: 'approved',
        transactionId: tx_ref,
        paymentDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        verifiedBy: 'Chapa Auto'
      };
      
      await db.collection('subscription_payments').add(paymentData);
      console.log('✅✅✅ PAYMENT SAVED TO subscription_payments ✅✅✅');
      
      // Update subscription
      const subscriptionQuery = await db.collection('subscriptions')
        .where('pharmacyId', '==', fullPharmacyId)
        .get();
      
      const newEndDate = new Date();
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
        console.log(`✅ Subscription updated to ${planType}`);
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
        console.log(`✅ New subscription created for ${planType}`);
      }
      
      // Update pharmacy status
      await db.collection('pharmacies').doc(fullPharmacyId).update({
        status: 'approved',
        isVerified: true,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      // Send notification
      await db.collection('pharmacy_notifications').add({
        pharmacyId: fullPharmacyId,
        type: 'payment_approved',
        title: '✅ Payment Successful!',
        message: `Your payment of ${correctAmount} ETB for ${planType} plan has been confirmed. Your subscription is active for ${daysToAdd} days.`,
        isRead: false,
        createdAt: admin.firestore.Timestamp.now()
      });
      
      console.log('✅ Notification sent');
      
    } catch (error) {
      console.error('❌ Error saving payment:', error);
    }
  } else {
    console.log(`⚠️ Status not success or no tx_ref: status=${status}, tx_ref=${tx_ref}`);
  }
  
  res.json({ received: true });
});

// POST callback for compatibility
app.post("/api/payments/callback", async (req, res) => {
  console.log("📞 Payment callback received (POST):", req.body);
  res.json({ received: true });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MediFind backend running on port ${PORT}`);
  console.log(`💰 Chapa payment mode: test`);
  console.log(`🔑 Chapa configured: YES`);
  console.log(`📡 Callback endpoint: /api/payments/callback`);
});