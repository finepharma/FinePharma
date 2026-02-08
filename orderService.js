/**
 * Order Service - Firestore Operations for Orders Collection
 * FinePharma Wholesale
 * 
 * Handles all order-related database operations including:
 * - Order creation
 * - Order status updates
 * - Order queries by user/role
 * - Order statistics
 */

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Collection reference
const ORDERS_COLLECTION = 'orders';

/**
 * Create a new order (Customer only)
 * @param {Object} orderData - Order data
 * @returns {Promise<string>} Created order ID
 */
export const createOrder = async (orderData) => {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  
  // Generate order ID
  const orderId = generateOrderId();
  
  const newOrder = {
    orderId,
    customerUid: orderData.customerUid,
    items: orderData.items || [],
    totalAmount: orderData.totalAmount || 0,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedByRole: 'customer'
  };
  
  const docRef = await addDoc(ordersRef, newOrder);
  return { id: docRef.id, orderId };
};

/**
 * Generate unique order ID
 * Format: FPW-YYYY-#####
 * @returns {string} Order ID
 */
const generateOrderId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `FPW-${year}-${random}`;
};

/**
 * Get order by document ID
 * @param {string} orderDocId - Order document ID
 * @returns {Promise<Object|null>} Order data or null
 */
export const getOrderById = async (orderDocId) => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderDocId);
  const orderSnap = await getDoc(orderRef);
  
  if (orderSnap.exists()) {
    return { id: orderSnap.id, ...orderSnap.data() };
  }
  return null;
};

/**
 * Get order by order ID (FPW-YYYY-#####)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} Order data or null
 */
export const getOrderByOrderId = async (orderId) => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('orderId', '==', orderId)
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

/**
 * Update order status (Staff and Admin)
 * @param {string} orderDocId - Order document ID
 * @param {string} newStatus - New status (pending/processing/shipped/delivered/cancelled)
 * @param {string} updatedByRole - Role of user updating (staff/admin)
 */
export const updateOrderStatus = async (orderDocId, newStatus, updatedByRole) => {
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid order status');
  }
  
  const orderRef = doc(db, ORDERS_COLLECTION, orderDocId);
  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
    updatedByRole
  });
};

/**
 * Get orders by customer UID
 * @param {string} customerUid - Customer UID
 * @returns {Promise<Array>} Customer's orders
 */
export const getOrdersByCustomer = async (customerUid) => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('customerUid', '==', customerUid),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for customer's orders
 * @param {string} customerUid - Customer UID
 * @param {Function} callback - Callback with orders array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCustomerOrders = (customerUid, callback) => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('customerUid', '==', customerUid),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(orders);
  });
};

/**
 * Get all orders (Admin and Staff)
 * @returns {Promise<Array>} All orders
 */
export const getAllOrders = async () => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for all orders (Admin and Staff)
 * @param {Function} callback - Callback with orders array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllOrders = (callback) => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(orders);
  });
};

/**
 * Get orders by status
 * @param {string} status - Order status
 * @returns {Promise<Array>} Filtered orders
 */
export const getOrdersByStatus = async (status) => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get pending orders count
 * @returns {Promise<number>} Pending orders count
 */
export const getPendingOrdersCount = async () => {
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('status', '==', 'pending')
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  return querySnapshot.size;
};

/**
 * Get orders statistics
 * @returns {Promise<Object>} Order statistics
 */
export const getOrderStatistics = async () => {
  const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
  
  const stats = {
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    todayTotal: 0,
    todayRevenue: 0
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.total++;
    
    if (data.status && stats[data.status] !== undefined) {
      stats[data.status]++;
    }
    
    // Check if order was created today
    if (data.createdAt) {
      const orderDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      if (orderDate >= today) {
        stats.todayTotal++;
        if (data.status !== 'cancelled') {
          stats.todayRevenue += data.totalAmount || 0;
        }
      }
    }
  });
  
  return stats;
};

/**
 * Get today's processed orders (Staff dashboard)
 * @returns {Promise<number>} Today's processed count
 */
export const getTodayProcessedOrders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const ordersQuery = query(
    collection(db, ORDERS_COLLECTION),
    where('status', 'in', ['processing', 'shipped', 'delivered']),
    where('updatedAt', '>=', Timestamp.fromDate(today)),
    where('updatedAt', '<', Timestamp.fromDate(tomorrow))
  );
  
  const querySnapshot = await getDocs(ordersQuery);
  return querySnapshot.size;
};
