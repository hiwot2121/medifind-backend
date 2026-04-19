const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config();

// ========== CREATE APP FIRST ==========
const app = express();
app.use(cors());
app.use(express.json());

// ========== IMMEDIATE HEALTH CHECK - MUST BE FIRST AND FAST ==========
app.get("/health", (req, res) => {
  return res.status(200).json({ status: "OK", mode: process.env.CHAPA_MODE || "test" });
});

app.get("/", (req, res) => {
  return res.status(200).json({ message: "MediFind Backend is running!" });
});

// ========== FIREBASE CONFIGURATION ==========
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
    this.secretKey = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST-J8HK5CLTYaGbDpHbfIfKWMlt20aXylN6";
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
        callback_url: `https://medifind-backend-production.up.railway.app/api/payments/callback`,
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

// ========== API ROUTES ==========
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

app.get("/api/payments/callback", async (req, res) => {
  console.log("📞 Payment callback received (GET):", req.query);
  
  const { trx_ref, status, amount, ref_id } = req.query;
  const tx_ref = trx_ref;
  
  console.log(`🔍 Extracted: tx_ref=${tx_ref}, status=${status}, amount=${amount}`);
  
  if (status === 'success') {
    try {
      if (!tx_ref) {
        console.error('❌ No transaction reference found');
        return res.json({ received: true, error: 'No transaction reference' });
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
      
      let actualAmount = amount ? parseFloat(amount) : 500;
      
      let planType = 'monthly';
      if (actualAmount === 1425) planType = 'quarterly';
      else if (actualAmount === 5100) planType = 'annual';
      
      const paymentData = {
        pharmacyId: fullPharmacyId,
        pharmacyName: pharmacyData.name || 'Unknown',
        amount: actualAmount,
        planType: planType,
        paymentMethod: 'chapa',
        status: 'approved',
        transactionId: tx_ref,
        paymentDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        verifiedBy: 'Chapa Auto'
      };
      
      await db.collection('subscription_payments').add(paymentData);
      console.log('✅ Payment saved to subscription_payments');
      
    } catch (error) {
      console.error('❌ Error saving payment:', error);
    }
  }
  
  res.json({ received: true });
});

app.post("/api/payments/callback", async (req, res) => {
  console.log("📞 Payment callback received (POST):", req.body);
  res.json({ received: true });
});

// ========== START SERVER - RAILWAY FIX ==========
const PORT = process.env.PORT || 8080;

// This is critical for Railway - must bind to 0.0.0.0
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MediFind backend running on port ${PORT}`);
  console.log(`💰 Chapa payment mode: test`);
  console.log(`📡 Callback endpoint: /api/payments/callback`);
});

// Handle graceful shutdown for Railway
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});