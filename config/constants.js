module.exports = {
  // Collection names
  COLLECTIONS: {
    USERS: 'users',
    PHARMACIES: 'pharmacies',
    MEDICINES: 'medicines', // This will be a subcollection under pharmacies
    ORDERS: 'orders',
    EMERGENCY_REQUESTS: 'emergencyRequests',
    PAYMENTS: 'payments',
    PRESCRIPTIONS: 'prescriptions',
    NOTIFICATIONS: 'notifications'
  },
  
  // Order status
  ORDER_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    DISPATCHED: 'dispatched',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },
  
  // Payment methods
  PAYMENT_METHODS: {
    CASH: 'cash',
    TELEBIRR: 'telebirr',
    MPESA: 'm-pesa',
    BANK: 'bank'
  },
  
  // Languages
  LANGUAGES: {
    ENGLISH: 'en',
    AMHARIC: 'am'
  }
};