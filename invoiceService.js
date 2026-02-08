/**
 * Invoice Service - Firestore Operations for Invoices Collection
 * FinePharma Wholesale
 * 
 * Handles all invoice-related database operations including:
 * - Invoice generation from orders
 * - Invoice retrieval
 * - Invoice queries by user/role
 */

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

// Collection reference
const INVOICES_COLLECTION = 'invoices';

/**
 * Generate a new invoice from an order
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Object>} Created invoice with ID
 */
export const generateInvoice = async (invoiceData) => {
  const invoicesRef = collection(db, INVOICES_COLLECTION);
  
  // Generate unique invoice ID
  const invoiceId = generateInvoiceId();
  
  const newInvoice = {
    invoiceId,
    orderId: invoiceData.orderId,
    orderDocId: invoiceData.orderDocId,
    customerUid: invoiceData.customerUid,
    customerName: invoiceData.customerName,
    customerEmail: invoiceData.customerEmail,
    customerAddress: invoiceData.customerAddress || '',
    items: invoiceData.items || [],
    subtotal: invoiceData.subtotal || 0,
    tax: invoiceData.tax || 0,
    taxRate: invoiceData.taxRate || 2.5, // Default 2.5% each for CGST/SGST
    discount: invoiceData.discount || 0,
    finalAmount: invoiceData.finalAmount || 0,
    status: invoiceData.status || 'pending',
    generatedAt: serverTimestamp(),
    generatedByUid: invoiceData.generatedByUid,
    generatedByName: invoiceData.generatedByName,
    notes: invoiceData.notes || ''
  };
  
  const docRef = await addDoc(invoicesRef, newInvoice);
  return { id: docRef.id, invoiceId, ...newInvoice };
};

/**
 * Generate unique invoice ID
 * Format: FPW-YYYY-#####
 * @returns {string} Invoice ID
 */
export const generateInvoiceId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `FPW-${year}-${random}`;
};

/**
 * Get invoice by document ID
 * @param {string} invoiceDocId - Invoice document ID
 * @returns {Promise<Object|null>} Invoice data or null
 */
export const getInvoiceById = async (invoiceDocId) => {
  const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceDocId);
  const invoiceSnap = await getDoc(invoiceRef);
  
  if (invoiceSnap.exists()) {
    return { id: invoiceSnap.id, ...invoiceSnap.data() };
  }
  return null;
};

/**
 * Get invoice by invoice ID (FPW-YYYY-#####)
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object|null>} Invoice data or null
 */
export const getInvoiceByInvoiceId = async (invoiceId) => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    where('invoiceId', '==', invoiceId)
  );
  
  const querySnapshot = await getDocs(invoicesQuery);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

/**
 * Get invoice by order ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} Invoice data or null
 */
export const getInvoiceByOrderId = async (orderId) => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    where('orderId', '==', orderId)
  );
  
  const querySnapshot = await getDocs(invoicesQuery);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

/**
 * Get invoices by customer UID
 * @param {string} customerUid - Customer UID
 * @returns {Promise<Array>} Customer's invoices
 */
export const getInvoicesByCustomer = async (customerUid) => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    where('customerUid', '==', customerUid),
    orderBy('generatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(invoicesQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for customer's invoices
 * @param {string} customerUid - Customer UID
 * @param {Function} callback - Callback with invoices array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCustomerInvoices = (customerUid, callback) => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    where('customerUid', '==', customerUid),
    orderBy('generatedAt', 'desc')
  );
  
  return onSnapshot(invoicesQuery, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(invoices);
  });
};

/**
 * Get all invoices (Admin and Staff)
 * @returns {Promise<Array>} All invoices
 */
export const getAllInvoices = async () => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    orderBy('generatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(invoicesQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for all invoices (Admin and Staff)
 * @param {Function} callback - Callback with invoices array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllInvoices = (callback) => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    orderBy('generatedAt', 'desc')
  );
  
  return onSnapshot(invoicesQuery, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(invoices);
  });
};

/**
 * Check if invoice exists for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>} True if invoice exists
 */
export const invoiceExistsForOrder = async (orderId) => {
  const invoicesQuery = query(
    collection(db, INVOICES_COLLECTION),
    where('orderId', '==', orderId)
  );
  
  const querySnapshot = await getDocs(invoicesQuery);
  return !querySnapshot.empty;
};

/**
 * Get invoice statistics
 * @returns {Promise<Object>} Invoice statistics
 */
export const getInvoiceStatistics = async () => {
  const snapshot = await getDocs(collection(db, INVOICES_COLLECTION));
  
  const stats = {
    total: 0,
    totalRevenue: 0,
    todayCount: 0,
    todayRevenue: 0
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.total++;
    stats.totalRevenue += data.finalAmount || 0;
    
    // Check if invoice was generated today
    if (data.generatedAt) {
      const invoiceDate = data.generatedAt.toDate ? data.generatedAt.toDate() : new Date(data.generatedAt);
      if (invoiceDate >= today) {
        stats.todayCount++;
        stats.todayRevenue += data.finalAmount || 0;
      }
    }
  });
  
  return stats;
};
