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
      
      console.log('📝 Generated tx_ref:', tx_ref);

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

      console.log(`💰 Initializing payment: ${payload.amount} ETB`);

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

      if (response.data.status === "success") {
        return {
          success: true,
          checkoutUrl: response.data.data.checkout_url,
          reference: tx_ref,
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
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            "Authorization": `Bearer ${this.secretKey}`
          },
          timeout: 30000
        }
      );

      const data = response.data.data || response.data;
      return {
        success: data.status === 'success',
        status: data.status || 'failed',
        amount: data.amount || 0,
        reference: reference
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
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
  res.json({ status: "OK", mode: "test", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ message: "MediFind Backend API is running!" });
});

// ========== TEST WEBHOOK ENDPOINT ==========
app.get("/api/payments/test", (req, res) => {
  console.log("✅ Test endpoint reached!");
  res.json({ success: true, message: "Webhook test successful", query: req.query });
});

// ========== API ROUTES ==========
app.get("/api/medicines", async (req, res) => {
  try {
    const { name, dosage } = req.query;
    let query = db.collection("medicines");
    if (name) query = query.where("name", "==", name);
    if (dosage) query = query.where("dosage", "==", dosage);
    const snapshot = await query.get();
    const medicines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PAYMENT ROUTES ==========
app.post("/api/payments/initiate", async (req, res) => {
  const { amount, email, phone, firstName, lastName, itemName, pharmacyId } = req.body;

  if (!amount || !email) {
    return res.status(400).json({ success: false, error: "Amount and email are required" });
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
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/payments/verify/:reference", async (req, res) => {
  const { reference } = req.params;
  const result = await chapa.verifyPayment(reference);
  res.json(result);
});

// ========== WEBHOOK CALLBACK - BOTH GET AND POST ==========
app.get("/api/payments/callback", async (req, res) => {
  console.log("📞 GET Callback received:", req.query);
  await processPayment(req.query, res);
});

app.post("/api/payments/callback", async (req, res) => {
  console.log("📞 POST Callback received:", req.body);
  await processPayment(req.body, res);
});

async function processPayment(data, res) {
  const { trx_ref, tx_ref, status, amount } = data;
  const transactionRef = trx_ref || tx_ref;
  
  console.log(`🔍 Processing: ref=${transactionRef}, status=${status}, amount=${amount}`);

  if (status !== 'success' || !transactionRef) {
    console.log(`⚠️ Not processing: status=${status}, ref=${transactionRef}`);
    return res.json({ received: true });
  }

  try {
    // Fetch correct amount from Chapa
    const verifyResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${transactionRef}`,
      { headers: { "Authorization": `Bearer ${chapa.secretKey}` } }
    );
    
    const correctAmount = verifyResponse.data.data?.amount;
    console.log(`💰 Correct amount: ${correctAmount}`);

    // Determine plan type using ranges
    let planType = 'monthly';
    let daysToAdd = 30;
    
    if (correctAmount >= 1400 && correctAmount <= 1450) {
      planType = 'quarterly';
      daysToAdd = 90;
    } else if (correctAmount >= 5000 && correctAmount <= 5200) {
      planType = 'annual';
      daysToAdd = 365;
    }

    // Extract pharmacy ID from transaction reference
    const parts = transactionRef.split('_');
    const shortPharmacyId = parts[1];
    
    // Find full pharmacy
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
      console.error(`❌ Pharmacy not found for ID: ${shortPharmacyId}`);
      return res.json({ received: true, error: 'Pharmacy not found' });
    }

    // Save payment
    const paymentData = {
      pharmacyId: fullPharmacyId,
      pharmacyName: pharmacyData.name,
      amount: correctAmount,
      planType: planType,
      paymentMethod: 'chapa',
      status: 'approved',
      transactionId: transactionRef,
      paymentDate: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      verifiedBy: 'Chapa Auto'
    };
    
    await db.collection('subscription_payments').add(paymentData);
    console.log(`✅ Payment saved: ${planType} - ${correctAmount} ETB`);

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
        updatedAt: admin.firestore.Timestamp.now()
      });
    } else {
      await db.collection('subscriptions').add({
        pharmacyId: fullPharmacyId,
        pharmacyName: pharmacyData.name,
        planType: planType,
        status: 'active',
        startDate: admin.firestore.Timestamp.now(),
        endDate: admin.firestore.Timestamp.fromDate(newEndDate),
        createdAt: admin.firestore.Timestamp.now()
      });
    }
    
    console.log(`✅ Subscription updated: ${planType}`);
    
    // Send notification
    await db.collection('pharmacy_notifications').add({
      pharmacyId: fullPharmacyId,
      type: 'payment_approved',
      title: '✅ Payment Successful!',
      message: `Your payment of ${correctAmount} ETB for ${planType} plan has been confirmed.`,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now()
    });
    
  } catch (error) {
    console.error('❌ Error processing payment:', error);
  }
  
  res.json({ received: true });
}

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`💰 Chapa mode: test`);
  console.log(`📡 Callback: /api/payments/callback`);
});