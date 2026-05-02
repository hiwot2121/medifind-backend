/**
 * MediFind Commission Configuration
 * 
 * This file controls how much commission MediFind takes from each delivery order.
 * Update these values to change commission rates.
 */

const COMMISSION_CONFIG = {
  // ========== COMMISSION TYPE ==========
  // Options: 'percentage', 'flat', 'both'
  TYPE: 'percentage',
  
  // ========== PERCENTAGE COMMISSION ==========
  // Percentage of medicine subtotal (not including delivery fee)
  PERCENTAGE: 10, // 10%
  
  // ========== FLAT FEE COMMISSION (optional) ==========
  // Fixed amount per order (in ETB)
  FLAT_FEE: 0, // 0 = disabled
  
  // ========== MINIMUM COMMISSION ==========
  // Minimum commission per order (in ETB)
  MINIMUM_COMMISSION: 5,
  
  // ========== MAXIMUM COMMISSION ==========
  // Maximum commission per order (in ETB)
  MAXIMUM_COMMISSION: 500,
  
  // ========== COMMISSION APPLIES TO ==========
  // Options: 'subtotal' (medicines only) or 'total' (medicines + delivery)
  APPLIES_TO: 'subtotal',
  
  // ========== DELIVERY FEE HANDLING ==========
  // Should 100% of delivery fee go to pharmacy?
  DELIVERY_FEE_TO_PHARMACY: true,
  
  // ========== CALCULATION METHODS ==========
  
  /**
   * Calculate commission based on order subtotal
   * @param {number} subtotal - Medicine cost before delivery fee
   * @returns {number} - Commission amount in ETB
   */
  calculateCommission: function(subtotal) {
    let commission = 0;
    
    // Apply based on type
    if (this.TYPE === 'percentage') {
      commission = (subtotal * this.PERCENTAGE) / 100;
    } else if (this.TYPE === 'flat') {
      commission = this.FLAT_FEE;
    } else if (this.TYPE === 'both') {
      commission = this.FLAT_FEE + (subtotal * this.PERCENTAGE) / 100;
    }
    
    // Apply min/max limits
    commission = Math.max(commission, this.MINIMUM_COMMISSION);
    commission = Math.min(commission, this.MAXIMUM_COMMISSION);
    
    return Math.round(commission);
  },
  
  /**
   * Calculate pharmacy earnings after commission
   * @param {number} subtotal - Medicine cost
   * @param {number} deliveryFee - Delivery fee
   * @returns {number} - Pharmacy earning amount in ETB
   */
  calculatePharmacyEarning: function(subtotal, deliveryFee = 0) {
    const commission = this.calculateCommission(subtotal);
    
    if (this.APPLIES_TO === 'subtotal') {
      // Commission only on medicines, delivery fee goes to pharmacy
      return Math.round(subtotal - commission + deliveryFee);
    } else {
      // Commission on total (medicines + delivery)
      const total = subtotal + deliveryFee;
      const totalCommission = this.calculateCommission(total);
      return Math.round(total - totalCommission);
    }
  },
  
  /**
   * Get breakdown of an order
   * @param {number} subtotal - Medicine cost
   * @param {number} deliveryFee - Delivery fee
   * @returns {Object} - Full breakdown
   */
  getBreakdown: function(subtotal, deliveryFee = 0) {
    const commission = this.calculateCommission(subtotal);
    const pharmacyEarning = this.calculatePharmacyEarning(subtotal, deliveryFee);
    const total = subtotal + deliveryFee;
    
    return {
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: total,
      commission: commission,
      commissionRate: this.PERCENTAGE,
      pharmacyEarning: pharmacyEarning,
      platformFee: commission
    };
  },
  
  /**
   * Format currency for display
   * @param {number} amount - Amount in ETB
   * @returns {string} - Formatted string
   */
  formatCurrency: function(amount) {
    return `${amount} ETB`;
  },
  
  /**
   * Get commission summary for display
   * @returns {string} - Human readable commission description
   */
  getDescription: function() {
    if (this.TYPE === 'percentage') {
      return `${this.PERCENTAGE}% of medicine cost`;
    } else if (this.TYPE === 'flat') {
      return `${this.FLAT_FEE} ETB per order`;
    } else if (this.TYPE === 'both') {
      return `${this.FLAT_FEE} ETB + ${this.PERCENTAGE}%`;
    }
    return 'Custom commission';
  }
};

// ========== SUBSCRIPTION PLANS ==========
// These are for pharmacy subscription payments (separate from delivery commission)
const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    name: 'Monthly',
    price: 500, // ETB
    durationDays: 30,
    description: 'Billed every month'
  },
  QUARTERLY: {
    name: 'Quarterly',
    price: 1425, // ETB (5% discount from 1500)
    durationDays: 90,
    discount: 5,
    description: 'Save 5% - Billed every 3 months'
  },
  ANNUAL: {
    name: 'Annual',
    price: 5100, // ETB (15% discount from 6000)
    durationDays: 365,
    discount: 15,
    description: 'Save 15% - Billed yearly'
  }
};

// ========== CHAPA CONFIGURATION ==========
const CHAPA_CONFIG = {
  MODE: process.env.CHAPA_MODE || 'test',
  BASE_URL: process.env.CHAPA_API_URL || 'https://api.chapa.co/v1',
  CALLBACK_URL: process.env.BASE_URL || 'https://medifind-backend-0raf.onrender.com',
  
  // Get appropriate key based on mode
  getSecretKey: function() {
    return this.MODE === 'live' 
      ? process.env.CHAPA_LIVE_SECRET_KEY 
      : process.env.CHAPA_SECRET_KEY;
  },
  
  getPublicKey: function() {
    return this.MODE === 'live'
      ? process.env.CHAPA_LIVE_PUBLIC_KEY
      : process.env.CHAPA_PUBLIC_KEY;
  }
};

// ========== EXPORT ALL CONFIGURATIONS ==========
module.exports = {
  COMMISSION_CONFIG,
  SUBSCRIPTION_PLANS,
  CHAPA_CONFIG
};