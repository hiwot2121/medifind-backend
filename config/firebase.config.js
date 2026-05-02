const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Firebase Admin
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  console.log('⚠️  Make sure you have firebase-service-account.json in config/ folder');
}

// Export Firebase services
const db = admin.firestore();
const bucket = admin.storage().bucket();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  bucket,
  auth
};