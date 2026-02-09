# FinePharma Wholesale - Firestore Database Schema

## Collections and Fields

### Collection: `users`
Document ID = Firebase Auth UID

```javascript
{
  uid: string,              // Same as document ID
  name: string,             // User's full name
  email: string,            // User's email address
  role: 'admin' | 'staff' | 'customer',
  status: 'active' | 'disabled',
  createdAt: timestamp,     // Account creation time
  lastLoginAt: timestamp    // Last login time
}
```

**Example Document:**
```javascript
{
  uid: "abc123xyz",
  name: "John Doe",
  email: "john@example.com",
  role: "customer",
  status: "active",
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

---

### Collection: `products`

```javascript
{
  name: string,             // Product name
  category: string,         // Product category (e.g., "Tablets", "Syrups")
  price: number,            // MRP (Maximum Retail Price)
  wholesalePrice: number,   // Wholesale price for B2B
  stock: number,            // Current stock quantity
  status: 'active' | 'inactive',
  imageUrl: string,         // Product image URL
  lowStockThreshold: number,// Alert threshold (default: 10)
  createdAt: timestamp,
  updatedAt: timestamp,
  updatedByUid: string      // UID of user who last updated
}
```

**Example Document:**
```javascript
{
  name: "Paracetamol 500mg",
  category: "Tablets",
  price: 50.00,
  wholesalePrice: 35.00,
  stock: 100,
  status: "active",
  imageUrl: "https://...",
  lowStockThreshold: 20,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedByUid: "adminUid123"
}
```

---

### Collection: `orders`

```javascript
{
  orderId: string,          // Format: FPW-YYYY-#####
  customerUid: string,      // Customer's UID
  items: array<{           // Order items
    productId: string,
    name: string,
    qty: number,
    price: number
  }>,
  totalAmount: number,
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  createdAt: timestamp,
  updatedAt: timestamp,
  updatedByRole: string     // Role that last updated
}
```

**Example Document:**
```javascript
{
  orderId: "FPW-2025-12345",
  customerUid: "customerUid123",
  items: [
    {
      productId: "prod123",
      name: "Paracetamol 500mg",
      qty: 10,
      price: 35.00
    }
  ],
  totalAmount: 350.00,
  status: "pending",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedByRole: "customer"
}
```

---

### Collection: `invoices`

```javascript
{
  invoiceId: string,        // Format: FPW-YYYY-#####
  orderId: string,          // Reference to order
  orderDocId: string,       // Firestore document ID of order
  customerUid: string,
  customerName: string,
  customerEmail: string,
  customerAddress: string,
  items: array<{
    productId: string,
    name: string,
    qty: number,
    price: number,
    mrp: number,
    rate: number,
    discount: string,
    hsn: string,
    gstRate: string
  }>,
  subtotal: number,
  tax: number,              // Per tax component (CGST/SGST)
  taxRate: number,          // Tax rate percentage (default: 2.5)
  discount: number,
  finalAmount: number,
  status: 'pending' | 'paid' | 'cancelled',
  generatedAt: timestamp,
  generatedByUid: string,
  generatedByName: string,
  notes: string
}
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isStaff() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'staff';
    }
    
    function isCustomer() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'customer';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isActive() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
    }

    // Users collection
    match /users/{userId} {
      // Users can read their own document
      allow read: if isOwner(userId) || isAdmin() || isStaff();
      
      // Only admin can create/update/delete users
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Products collection
    match /products/{productId} {
      // Anyone authenticated can read active products
      allow read: if isAuthenticated() && 
        (resource.data.status == 'active' || isAdmin() || isStaff());
      
      // Only admin can create products
      allow create: if isAdmin() && isActive();
      
      // Admin can update any field, staff can only update stock
      allow update: if isAdmin() && isActive() ||
        (isStaff() && isActive() && 
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['stock', 'updatedAt', 'updatedByUid']));
      
      // Only admin can delete (soft delete)
      allow delete: if isAdmin() && isActive();
    }

    // Orders collection
    match /orders/{orderId} {
      // Customers can read their own orders, staff/admin can read all
      allow read: if isAuthenticated() && 
        (resource.data.customerUid == request.auth.uid || isStaff() || isAdmin());
      
      // Customers can create orders for themselves
      allow create: if isCustomer() && isActive() && 
        request.resource.data.customerUid == request.auth.uid;
      
      // Staff/Admin can update status
      allow update: if isAuthenticated() && isActive() && 
        (isStaff() || isAdmin());
      
      // Only admin can delete
      allow delete: if isAdmin() && isActive();
    }

    // Invoices collection
    match /invoices/{invoiceId} {
      // Customers can read their own invoices, staff/admin can read all
      allow read: if isAuthenticated() && 
        (resource.data.customerUid == request.auth.uid || isStaff() || isAdmin());
      
      // Staff/Admin can create invoices
      allow create: if isAuthenticated() && isActive() && 
        (isStaff() || isAdmin());
      
      // Only admin can update/delete
      allow update: if isAdmin() && isActive();
      allow delete: if isAdmin() && isActive();
    }
  }
}
```

---

## Required Firestore Indexes

Create these composite indexes in Firebase Console:

### products collection
```
Collection: products
Fields:
  - status (Ascending)
  - name (Ascending)
```

### orders collection
```
Collection: orders
Fields:
  - customerUid (Ascending)
  - createdAt (Descending)

Collection: orders
Fields:
  - status (Ascending)
  - createdAt (Descending)
```

### invoices collection
```
Collection: invoices
Fields:
  - customerUid (Ascending)
  - generatedAt (Descending)
```

---

## First Admin Bootstrap

To create the first admin user:

1. Use the signup form with the admin setup code: `FINEPHARMA-ADMIN-2025`
2. The system will check if any admin exists
3. If no admin exists, the first user with the correct code becomes admin
4. Subsequent users will default to 'customer' role

**Note:** Store the setup code securely and change it after first admin creation.

---

## Data Validation Rules

### Products
- `price` and `wholesalePrice` must be positive numbers
- `stock` must be non-negative
- `name` and `category` are required

### Orders
- `items` array must not be empty
- `totalAmount` must match sum of item totals
- `customerUid` must match authenticated user (for customers)

### Users
- `role` must be one of: 'admin', 'staff', 'customer'
- `status` must be one of: 'active', 'disabled'
- `email` must be valid format
