const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const axios = require("axios");
require("dotenv").config();

// ========== IMPORT COMMISSION CONFIG ==========
const { COMMISSION_CONFIG } = require('./config/commission');

// ========== FIREBASE CONFIGURATION ==========
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "medifind-gondar-d27f7",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "f2ed81e978bcf28917d16be051933beab550ae71",
  private_key: (process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDXbnijFT4FLO+p\n4m3TSsoGLiBVEVVZ/py/ureZgJh7W16av7hp4RS8SAMBvNb5gFNoD6/Uju0PHG5b\nTPOkKPYzuZAw9gwcZc2kBFfnJhvUldnre1OGjbzfgTUyfhlhL5b5NMHQqBUoreMB\n++zFaxlrtr/akwbV+oRjA0G8ugzj8YtDenkyyazKtXF47Y3Ll+NRD8X7R41AZECJ\nlOdu/b0K7BS/zWfBPZElR1ufRsJSv6Ih7VQ3FAmdn0MqiKEfONTYmF0HQKWcauo5\nTy5Js+iqW+ZUiBmQgQz8q36bNs26HUEuT6T3KuoOKm3ha3Ain5HpPHQNqRYqzN6n\nK/9op4GfAgMBAAECggEAKSv+uEQ+ByUwZIpWrPP1Kjs0iK14X2uur2HS5u5Rtfmf\nWfncF7ghi15D3NgnSaXByvh8hSYPnjyzxpUtVylQ7E/Bg+nyJJc8NuVxm0aIOReu\nfzehneyGtTxvW0gIN6+trdDsXaFR8eVRpjZsaMpwIErb3b0NqGVpWbbsoFH6VrGg\nNEu0K241K3oEBbTSLXS2prkh55f5ByIDzCiYH7thjt2ka9zUG7ENyfq+L3GGpiDn\nFcs0xe8rCgAoofGhDPhkZg57k5kVUTau10RJP2a22orbiJiNWBZVz2TskuGFiAIL\nFWNdOUyWFrHIiD9TMZvQSLZFKaK9CGSKWnFhrc906QKBgQD0ET00gNv25QVwl5vT\naR3jHZhCFZ0AblQLDwn/Nhn7Fj/pzdQ/QXqM2ttjj0Df2oMviLt9LkeuQ1nMITPw\nvbTDbj0wXEo8OFQdjM2JRjgCPPo3fk4/piGWA6+SVNBhkO62roOm+zwikJEpDgys\nZMUieSqFP3Zo+GTbVNmuVNLiswKBgQDh9tMeU/uOVWIudw84tpX1lY8B47ThK7Ag\nQmNpt8PyzNpf7vvrByrrX+7rSMnP6wLOEddDPHg1o5UacfQNjPXdkpprrhOEyzRV\nOokIdNHXZjadvY3gsDB09GQFIgl0+tBqv5k/7Xc5EKkqdWTd7OymFMxMn3nkqn6v\nZhyulSArZQKBgDZhKOvr0ha+jGm7veJqx1f1HhmLS0HvUxZrsWSFn2BMYs0rKSE2\n66E6misinefCffw3UN7hUuNG6lkLBNGc0wvAIi4GQhwMyOEUoC730D7fazi2EaUo\n1M7h31qRPySd8DIPzBGGZK2m3FDzamt2wF2f9ZNewnk87uvXifDHwXz1AoGAB2jV\nkWgFlqw8FPP4fs6V6kCmONSjqMKK+vPSWLQa68pF2uF2R0Wr5Z32sqZnX7cAF4vE\nOEMyWefsSrqz2wHlSge1opRJtZAIPkc2GR3jh6GlZtTBYz3DyQH+iaCNGNXkoat4\ntfzubOOb+HVzAkfzlpqV/Gk6UQI6Nzws8piXPnUCgYB1trGVs1ML95sB/WqoFzfg\nNaUQCLPePVhNlICRYa81w7/s2E45+ZDqgROeDmRv1kXro7SaxhgXc0nVebGMj/7z\nt5D9SCUpBb/4Cbt7eGzl7ZJU+sVdHu912nBjDYn9fKM/5u4OZRdwVRcYs3duQl+A\nZOgmxwIDpLY8eF5Yg8hmEQ==\n-----END PRIVATE KEY-----\n").replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@medifind-gondar-d27f7.iam.gserviceaccount.com",
  client_id: process.env.FIREBASE_CLIENT_ID || "101419702510438472859",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40medifind-gondar-d27f7.iam.gserviceaccount.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ========== CHAPA PAYMENT SERVICE (Subscription) ==========
class ChapaService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST-J8HK5CLTYaGbDpHbfIfKWMlt20aXylN6";
    this.baseUrl = "https://api.chapa.co/v1";
    this.mode = "test";
  }

  async initializePayment(paymentData) {
    try {
      const shortPharmacyId = (paymentData.pharmacyId || 'unknown').substring(0, 8);
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 6);
      const tx_ref = `SUB_${shortPharmacyId}_${timestamp}_${random}`;
      
      console.log('📝 Subscription tx_ref:', tx_ref);

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
          title: "MediFind Subscription",
          description: this.mode === "test" ? "TEST MODE" : paymentData.description
        }
      };

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
        { headers: { "Authorization": `Bearer ${this.secretKey}` } }
      );
      const data = response.data.data || response.data;
      return {
        success: data.status === 'success',
        status: data.status || 'failed',
        amount: data.amount || 0,
        reference: reference
      };
    } catch (error) {
      return { success: false, error: error.message, status: 'failed' };
    }
  }
}

const chapa = new ChapaService();

// ========== DELIVERY CHAPA SERVICE ==========
class DeliveryChapaService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST-J8HK5CLTYaGbDpHbfIfKWMlt20aXylN6";
    this.baseUrl = "https://api.chapa.co/v1";
    this.mode = "test";
  }

  async initializeDeliveryPayment(paymentData) {
    try {
      const shortPharmacyId = (paymentData.pharmacyId || 'unknown').substring(0, 8);
      const timestamp = Date.now().toString().slice(-8);
      const tx_ref = `DEL_${shortPharmacyId}_${timestamp}`;
      
      console.log('🚚 Delivery tx_ref:', tx_ref);

      const payload = {
        amount: paymentData.totalAmount,
        currency: "ETB",
        email: paymentData.email,
        first_name: paymentData.firstName || "Customer",
        last_name: paymentData.lastName || "",
        phone_number: paymentData.phone || "0912345678",
        tx_ref: tx_ref,
        callback_url: `https://medifind-backend-0raf.onrender.com/api/delivery/callback`,
        return_url: `https://medifind-gondar-d27f7.web.app/payment/status`,
        customization: {
          title: `Payment to ${paymentData.pharmacyName}`,
          description: `Medicines + Delivery`
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${this.secretKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.status === "success") {
        return {
          success: true,
          checkoutUrl: response.data.data.checkout_url,
          reference: tx_ref
        };
      } else {
        throw new Error(response.data.message || "Payment failed");
      }
    } catch (error) {
      console.error("Delivery Chapa error:", error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

const deliveryChapa = new DeliveryChapaService();

// ========== CHAPA INSTANT PAYOUT SERVICE (NEW) ==========
class ChapaInstantPayoutService {
  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST-J8HK5CLTYaGbDpHbfIfKWMlt20aXylN6";
    this.baseUrl = "https://api.chapa.co/v1";
  }

  getBankCode(bankName) {
    const bankCodes = {
      'Commercial Bank of Ethiopia': 'CBE',
      'Awash Bank': 'AWASH',
      'Dashen Bank': 'DASHEN',
      'Abyssinia Bank': 'ABYSSINIA',
      'Wegagen Bank': 'WEGAGEN',
      'Nib International Bank': 'NIB',
      'Cooperative Bank of Oromia': 'COOP',
      'Lion International Bank': 'LION',
      'Zemen Bank': 'ZEMEN',
      'Bunna Bank': 'BUNNA',
      'United Bank': 'UNITED',
      'Berhan Bank': 'BERHAN',
      'Hibret Bank': 'HIBRET'
    };
    return bankCodes[bankName] || 'CBE';
  }

  async instantTransfer(transferData) {
    try {
      const payload = {
        account_name: transferData.accountName,
        account_number: transferData.accountNumber,
        bank_code: this.getBankCode(transferData.bankName),
        amount: transferData.amount,
        currency: 'ETB',
        reference: `INSTANT_${transferData.orderId}_${Date.now()}`,
        narration: `MediFind Order #${transferData.orderId} - ${transferData.pharmacyName}`
      };

      console.log(`⚡ INSTANT TRANSFER INITIATED:`);
      console.log(`   Pharmacy: ${transferData.pharmacyName}`);
      console.log(`   Bank: ${transferData.bankName} (${payload.bank_code})`);
      console.log(`   Account: ${transferData.accountName} (****${transferData.accountNumber.slice(-4)})`);
      console.log(`   Amount: ${transferData.amount} ETB`);
      console.log(`   Order: ${transferData.orderId}`);

      const response = await axios.post(
        `${this.baseUrl}/transfers`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log(`✅ Instant transfer successful!`);
      console.log(`   Transfer ID: ${response.data.data?.id}`);
      console.log(`   Status: ${response.data.data?.status}`);

      return {
        success: true,
        transferId: response.data.data?.id,
        status: response.data.data?.status || 'processing',
        reference: payload.reference
      };
    } catch (error) {
      console.error('❌ Instant transfer failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

const instantPayout = new ChapaInstantPayoutService();

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

// ========== SUBSCRIPTION PAYMENT (Pharmacy → MediFind) ==========
app.post("/api/payments/initiate", async (req, res) => {
  const { amount, email, phone, firstName, lastName, itemName, pharmacyId } = req.body;
  if (!amount || !email) {
    return res.status(400).json({ success: false, error: "Amount and email required" });
  }
  try {
    const result = await chapa.initializePayment({
      amount: parseFloat(amount),
      email, phone, firstName, lastName,
      description: itemName || "Subscription",
      pharmacyId
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/payments/verify/:reference", async (req, res) => {
  const result = await chapa.verifyPayment(req.params.reference);
  res.json(result);
});

// ========== DELIVERY PAYMENT (Patient → Pharmacy with 10% Commission) ==========
app.post("/api/delivery/initiate-payment", async (req, res) => {
  const { subtotal, deliveryFee, email, phone, firstName, lastName, pharmacyId, pharmacyName, items } = req.body;

  if (!subtotal || !email || !pharmacyId) {
    return res.status(400).json({ success: false, error: "Subtotal, email, and pharmacyId required" });
  }

  try {
    const medicineSubtotal = parseFloat(subtotal);
    const deliveryFeeAmount = parseFloat(deliveryFee) || 0;
    const totalAmount = medicineSubtotal + deliveryFeeAmount;
    
    const commission = COMMISSION_CONFIG.calculateCommission(medicineSubtotal);
    const pharmacyEarning = COMMISSION_CONFIG.calculatePharmacyEarning(medicineSubtotal, deliveryFeeAmount);
    
    console.log(`📊 Delivery Order:`);
    console.log(`   Medicines: ${medicineSubtotal} ETB`);
    console.log(`   Delivery: ${deliveryFeeAmount} ETB`);
    console.log(`   Total: ${totalAmount} ETB`);
    console.log(`   Commission (${COMMISSION_CONFIG.PERCENTAGE}%): ${commission} ETB`);
    console.log(`   Pharmacy Earns: ${pharmacyEarning} ETB`);

    const orderRef = await db.collection("orders").add({
      pharmacyId, pharmacyName,
      customerEmail: email,
      customerPhone: phone,
      customerName: `${firstName || ''} ${lastName || ''}`.trim(),
      items: items || [],
      subtotal: medicineSubtotal,
      deliveryFee: deliveryFeeAmount,
      totalAmount,
      commission,
      pharmacyEarning,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const orderId = orderRef.id;
    console.log(`📦 Order created: ${orderId}`);

    const result = await deliveryChapa.initializeDeliveryPayment({
      totalAmount, email, phone, firstName, lastName, pharmacyId, pharmacyName, orderId
    });

    if (result.success) {
      await db.collection("orders").doc(orderId).update({
        paymentReference: result.reference,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.json({
      ...result,
      orderId,
      breakdown: { subtotal: medicineSubtotal, deliveryFee: deliveryFeeAmount, total: totalAmount, commission, pharmacyEarning }
    });

  } catch (error) {
    console.error('Delivery payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== WEBHOOK CALLBACKS ==========
app.get("/api/payments/callback", async (req, res) => {
  await processSubscriptionPayment(req.query, res);
});

app.post("/api/payments/callback", async (req, res) => {
  await processSubscriptionPayment(req.body, res);
});

app.get("/api/delivery/callback", async (req, res) => {
  await processDeliveryPayment(req.query, res);
});

app.post("/api/delivery/callback", async (req, res) => {
  await processDeliveryPayment(req.body, res);
});

// ========== SUBSCRIPTION PAYMENT PROCESSING ==========
async function processSubscriptionPayment(data, res) {
  const { trx_ref, tx_ref, status } = data;
  const transactionRef = trx_ref || tx_ref;
  
  if (status !== 'success' || !transactionRef) {
    return res.json({ received: true });
  }

  try {
    const verifyResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${transactionRef}`,
      { headers: { "Authorization": `Bearer ${chapa.secretKey}` } }
    );
    
    const amount = verifyResponse.data.data?.amount;
    let planType = 'monthly';
    let daysToAdd = 30;
    if (amount >= 1400 && amount <= 1450) { planType = 'quarterly'; daysToAdd = 90; }
    else if (amount >= 5000 && amount <= 5200) { planType = 'annual'; daysToAdd = 365; }

    const parts = transactionRef.split('_');
    const shortPharmacyId = parts[1];
    
    const pharmaciesSnapshot = await db.collection('pharmacies').get();
    let fullPharmacyId = null, pharmacyData = null;
    for (const doc of pharmaciesSnapshot.docs) {
      if (doc.id.startsWith(shortPharmacyId)) {
        fullPharmacyId = doc.id;
        pharmacyData = doc.data();
        break;
      }
    }
    
    if (!pharmacyData) return res.json({ received: true });

    await db.collection('subscription_payments').add({
      pharmacyId: fullPharmacyId, pharmacyName: pharmacyData.name,
      amount, planType, paymentMethod: 'chapa', status: 'approved',
      transactionId: transactionRef,
      paymentDate: admin.firestore.Timestamp.now()
    });

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    
    const subscriptionQuery = await db.collection('subscriptions')
      .where('pharmacyId', '==', fullPharmacyId).get();
    
    if (!subscriptionQuery.empty) {
      await subscriptionQuery.docs[0].ref.update({
        status: 'active', planType,
        endDate: admin.firestore.Timestamp.fromDate(newEndDate)
      });
    } else {
      await db.collection('subscriptions').add({
        pharmacyId: fullPharmacyId, pharmacyName: pharmacyData.name,
        planType, status: 'active',
        startDate: admin.firestore.Timestamp.now(),
        endDate: admin.firestore.Timestamp.fromDate(newEndDate)
      });
    }

    await db.collection('pharmacy_notifications').add({
      pharmacyId: fullPharmacyId, type: 'payment_approved',
      title: '✅ Payment Successful!',
      message: `Your ${planType} subscription is active.`,
      isRead: false, createdAt: admin.firestore.Timestamp.now()
    });

    console.log(`✅ Subscription processed: ${pharmacyData.name} - ${planType}`);
  } catch (error) {
    console.error('Subscription error:', error);
  }
  res.json({ received: true });
}

// ========== DELIVERY PAYMENT PROCESSING WITH INSTANT SETTLEMENT (UPDATED) ==========
async function processDeliveryPayment(data, res) {
  const { trx_ref, tx_ref, status } = data;
  const transactionRef = trx_ref || tx_ref;
  
  console.log(`🚚 Processing delivery payment: ${transactionRef}`);
  
  if (status !== 'success' || !transactionRef) {
    console.log(`⚠️ Payment not successful: status=${status}`);
    return res.json({ received: true });
  }

  try {
    // Verify payment with Chapa
    const verifyResponse = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${transactionRef}`,
      { headers: { "Authorization": `Bearer ${deliveryChapa.secretKey}` } }
    );
    
    const paidAmount = verifyResponse.data.data?.amount;
    console.log(`✅ Payment verified: ${paidAmount} ETB`);

    // Find order
    const orderQuery = await db.collection('orders')
      .where('paymentReference', '==', transactionRef).get();
    
    if (orderQuery.empty) {
      console.error(`❌ Order not found: ${transactionRef}`);
      return res.json({ received: true });
    }

    const orderDoc = orderQuery.docs[0];
    const orderData = orderDoc.data();
    const orderId = orderDoc.id;
    const pharmacyId = orderData.pharmacyId;
    const pharmacyName = orderData.pharmacyName;
    const commission = orderData.commission || 0;
    const pharmacyEarning = orderData.pharmacyEarning || 0;

    // Get pharmacy bank details
    const pharmacyDoc = await db.collection('pharmacies').doc(pharmacyId).get();
    const pharmacyData = pharmacyDoc.data();
    const bankDetails = pharmacyData?.settlementAccount;

    // Update order as paid
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'paid',
      paymentMethod: 'chapa',
      paymentConfirmedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update platform revenue
    const month = new Date().toISOString().slice(0, 7);
    const revenueRef = db.collection('platform_revenue').doc(month);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(revenueRef);
      if (!doc.exists) {
        transaction.set(revenueRef, {
          month, totalCommission: commission, totalOrders: 1,
          createdAt: admin.firestore.Timestamp.now()
        });
      } else {
        transaction.update(revenueRef, {
          totalCommission: admin.firestore.FieldValue.increment(commission),
          totalOrders: admin.firestore.FieldValue.increment(1)
        });
      }
    });

    // ========== INSTANT SETTLEMENT ==========
    if (bankDetails && bankDetails.accountNumber && bankDetails.accountName && bankDetails.bankName) {
      console.log(`⚡ INSTANT SETTLEMENT: Transferring ${pharmacyEarning} ETB to ${pharmacyName}...`);
      
      const transferResult = await instantPayout.instantTransfer({
        orderId: orderId,
        pharmacyId: pharmacyId,
        pharmacyName: pharmacyName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        amount: pharmacyEarning
      });

      if (transferResult.success) {
        // Record successful instant settlement
        await db.collection('instant_settlements').add({
          orderId: orderId,
          pharmacyId: pharmacyId,
          pharmacyName: pharmacyName,
          amount: pharmacyEarning,
          commission: commission,
          transferId: transferResult.transferId,
          reference: transferResult.reference,
          bankName: bankDetails.bankName,
          accountLast4: bankDetails.accountNumber.slice(-4),
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update total settled amount
        await db.collection('pharmacy_earnings').doc(pharmacyId).set({
          pharmacyId: pharmacyId,
          pharmacyName: pharmacyName,
          balance: 0,
          totalEarned: admin.firestore.FieldValue.increment(pharmacyEarning),
          totalSettled: admin.firestore.FieldValue.increment(pharmacyEarning),
          lastSettlement: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Notify pharmacy
        await db.collection('pharmacy_notifications').add({
          pharmacyId: pharmacyId,
          type: 'instant_settlement',
          title: '💰 Instant Payment Received!',
          message: `${pharmacyEarning} ETB has been transferred to your ${bankDetails.bankName} account (****${bankDetails.accountNumber.slice(-4)}).`,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Instant settlement complete! Order ${orderId}`);
      } else {
        // Transfer failed - hold in balance
        console.log(`⚠️ Instant transfer failed, holding in balance`);
        await holdFundsInBalance(pharmacyId, pharmacyName, pharmacyEarning, orderId);
      }
    } else {
      // No bank details - hold in balance
      console.log(`⚠️ Pharmacy ${pharmacyName} has no bank details, holding funds`);
      await holdFundsInBalance(pharmacyId, pharmacyName, pharmacyEarning, orderId);
      
      // Notify pharmacy to add bank details
      await db.collection('pharmacy_notifications').add({
        pharmacyId: pharmacyId,
        type: 'bank_details_needed',
        title: '🏦 Add Bank Details',
        message: `You have ${pharmacyEarning} ETB waiting. Add bank details to receive instant payments.`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

  } catch (error) {
    console.error('❌ Delivery processing error:', error);
  }
  res.json({ received: true });
}

// Helper function to hold funds when instant transfer fails or no bank details
async function holdFundsInBalance(pharmacyId, pharmacyName, amount, orderId) {
  const earningsRef = db.collection('pharmacy_earnings').doc(pharmacyId);
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(earningsRef);
    if (!doc.exists) {
      transaction.set(earningsRef, {
        pharmacyId, pharmacyName,
        balance: amount,
        totalEarned: amount,
        createdAt: admin.firestore.Timestamp.now()
      });
    } else {
      transaction.update(earningsRef, {
        balance: admin.firestore.FieldValue.increment(amount),
        totalEarned: admin.firestore.FieldValue.increment(amount)
      });
    }
  });
  console.log(`💰 Funds held in balance: ${pharmacyName} - ${amount} ETB`);
}

// ========== EARNINGS ENDPOINTS ==========
app.get("/api/pharmacy/:pharmacyId/earnings", async (req, res) => {
  try {
    const { pharmacyId } = req.params;
    const earningsDoc = await db.collection('pharmacy_earnings').doc(pharmacyId).get();
    
    if (!earningsDoc.exists) {
      return res.json({ balance: 0, totalEarned: 0, totalSettled: 0 });
    }
    
    res.json(earningsDoc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`💰 Commission Rate: ${COMMISSION_CONFIG.PERCENTAGE}%`);
  console.log(`📡 Subscription Callback: /api/payments/callback`);
  console.log(`🚚 Delivery Callback: /api/delivery/callback`);
  console.log(`⚡ Instant Settlement: ENABLED`);
});