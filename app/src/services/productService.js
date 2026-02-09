/**
 * Product Service - Firestore Operations for Products Collection
 * FinePharma Wholesale
 * 
 * Handles all product-related database operations including:
 * - Product CRUD operations
 * - Stock management
 * - Category filtering
 * - Low stock alerts
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Collection reference
const PRODUCTS_COLLECTION = 'products';

/**
 * Create a new product (Admin only)
 * @param {Object} productData - Product data
 * @returns {Promise<string>} Created product ID
 */
export const createProduct = async (productData) => {
  const productsRef = collection(db, PRODUCTS_COLLECTION);
  
  const newProduct = {
    ...productData,
    status: productData.status || 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const docRef = await addDoc(productsRef, newProduct);
  return docRef.id;
};

/**
 * Get product by ID
 * @param {string} productId - Product document ID
 * @returns {Promise<Object|null>} Product data or null
 */
export const getProductById = async (productId) => {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const productSnap = await getDoc(productRef);
  
  if (productSnap.exists()) {
    return { id: productSnap.id, ...productSnap.data() };
  }
  return null;
};

/**
 * Update product (Admin only)
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @param {string} updatedByUid - UID of user making the update
 */
export const updateProduct = async (productId, updates, updatedByUid) => {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  
  await updateDoc(productRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedByUid
  });
};

/**
 * Update product stock only (Staff and Admin)
 * @param {string} productId - Product ID
 * @param {number} newStock - New stock quantity
 * @param {string} updatedByUid - UID of user making the update
 */
export const updateProductStock = async (productId, newStock, updatedByUid) => {
  if (newStock < 0) {
    throw new Error('Stock cannot be negative');
  }
  
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(productRef, {
    stock: newStock,
    updatedAt: serverTimestamp(),
    updatedByUid
  });
};

/**
 * Soft delete product - set status to inactive (Admin only)
 * @param {string} productId - Product ID
 * @param {string} updatedByUid - UID of user making the update
 */
export const softDeleteProduct = async (productId, updatedByUid) => {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(productRef, {
    status: 'inactive',
    updatedAt: serverTimestamp(),
    updatedByUid
  });
};

/**
 * Get all active products
 * @returns {Promise<Array>} Array of active products
 */
export const getActiveProducts = async () => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active'),
    orderBy('name')
  );
  
  const querySnapshot = await getDocs(productsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for active products
 * @param {Function} callback - Callback with products array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToActiveProducts = (callback) => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active'),
    orderBy('name')
  );
  
  return onSnapshot(productsQuery, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(products);
  });
};

/**
 * Get products by category
 * @param {string} category - Category name
 * @returns {Promise<Array>} Filtered products
 */
export const getProductsByCategory = async (category) => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active'),
    where('category', '==', category),
    orderBy('name')
  );
  
  const querySnapshot = await getDocs(productsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get all products including inactive (Admin only)
 * @returns {Promise<Array>} All products
 */
export const getAllProducts = async () => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    orderBy('name')
  );
  
  const querySnapshot = await getDocs(productsQuery);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for all products (Admin only)
 * @param {Function} callback - Callback with products array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllProducts = (callback) => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    orderBy('name')
  );
  
  return onSnapshot(productsQuery, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(products);
  });
};

/**
 * Get low stock products (stock < threshold)
 * @returns {Promise<Array>} Low stock products
 */
export const getLowStockProducts = async () => {
  // Note: This requires a composite index in Firestore
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active')
  );
  
  const querySnapshot = await getDocs(productsQuery);
  const products = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Filter in memory for low stock
  return products.filter(product => {
    const threshold = product.lowStockThreshold || 10;
    return product.stock <= threshold;
  });
};

/**
 * Real-time listener for low stock products
 * @param {Function} callback - Callback with low stock products
 * @returns {Function} Unsubscribe function
 */
export const subscribeToLowStockProducts = (callback) => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active')
  );
  
  return onSnapshot(productsQuery, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const lowStock = products.filter(product => {
      const threshold = product.lowStockThreshold || 10;
      return product.stock <= threshold;
    });
    
    callback(lowStock);
  });
};

/**
 * Get product categories (unique)
 * @returns {Promise<Array>} Array of category names
 */
export const getProductCategories = async () => {
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active')
  );
  
  const querySnapshot = await getDocs(productsQuery);
  const categories = new Set();
  
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.category) {
      categories.add(data.category);
    }
  });
  
  return Array.from(categories).sort();
};

/**
 * Get product counts for dashboard
 * @returns {Promise<Object>} Product counts
 */
export const getProductCounts = async () => {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const counts = { total: 0, active: 0, inactive: 0, lowStock: 0 };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    counts.total++;
    
    if (data.status === 'active') {
      counts.active++;
      const threshold = data.lowStockThreshold || 10;
      if (data.stock <= threshold) {
        counts.lowStock++;
      }
    } else {
      counts.inactive++;
    }
  });
  
  return counts;
};

/**
 * Search products by name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching products
 */
export const searchProducts = async (searchTerm) => {
  // Note: For production, consider using Algolia or similar for full-text search
  const productsQuery = query(
    collection(db, PRODUCTS_COLLECTION),
    where('status', '==', 'active')
  );
  
  const querySnapshot = await getDocs(productsQuery);
  const products = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Simple client-side search
  const term = searchTerm.toLowerCase();
  return products.filter(product => 
    product.name?.toLowerCase().includes(term) ||
    product.category?.toLowerCase().includes(term)
  );
};
