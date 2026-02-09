# FinePharma Wholesale - Firebase SaaS Web App

A comprehensive wholesale pharmacy management system built with React, Firebase Auth, and Firestore.

## Features

### Authentication & Authorization
- Firebase Authentication (email/password)
- Role-based access control (Admin, Staff, Customer)
- Session persistence with auto-redirect
- Password reset functionality

### User Roles

#### Admin
- Full dashboard access
- Product management (CRUD)
- User management (role assignment, status toggle)
- Order management
- Invoice generation
- Stock alerts
- System reports

#### Staff
- View products and update stock only
- Process orders (status updates)
- View customer list (read-only)
- Generate invoices
- Cannot modify prices or delete products

#### Customer
- Browse products
- Place orders
- View order history
- Download invoices
- View profile

## Project Structure

```
src/
├── components/
│   └── invoice/
│       ├── InvoiceTemplate.jsx    # GST Invoice template
│       └── InvoiceGenerator.jsx   # Invoice generation UI
├── context/
│   └── AuthContext.jsx            # Global auth state
├── guards/
│   └── RouteGuard.jsx             # Route protection components
├── pages/
│   ├── Login.jsx                  # Login page
│   ├── Home.jsx                   # Customer home page
│   ├── AdminDashboard.jsx         # Admin dashboard
│   └── StaffDashboard.jsx         # Staff dashboard
├── services/
│   ├── firebase.js                # Firebase initialization
│   ├── authService.js             # Auth operations
│   ├── userService.js             # User CRUD
│   ├── productService.js          # Product CRUD
│   ├── orderService.js            # Order operations
│   └── invoiceService.js          # Invoice operations
├── App.jsx                        # Main app with routes
└── index.css                      # Global styles
```

## Setup Instructions

### 1. Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password provider)
3. Create a Firestore database
4. Add your Firebase config to `src/services/firebase.js`

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firestore Security Rules

Copy the security rules from `firestore-schema.md` to your Firebase Console > Firestore Database > Rules.

### 4. Create Firestore Indexes

Create the required composite indexes as documented in `firestore-schema.md`.

### 5. Create First Admin User

1. Start the development server
2. Go to `/login` and click signup (if available) or use the bootstrap method
3. Use the admin setup code: `FINEPHARMA-ADMIN-2025`
4. The first user created with this code becomes admin

### 6. Run the App

```bash
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Login page (redirects if logged in) |
| `/home` | All roles | Main landing page |
| `/admin-dashboard` | Admin only | Full admin dashboard |
| `/staff-dashboard` | Staff only | Staff operational dashboard |
| `/invoices/generate` | Admin, Staff | Invoice generator |

## Firestore Collections

- `users` - User profiles with roles
- `products` - Product catalog
- `orders` - Customer orders
- `invoices` - Generated invoices

See `firestore-schema.md` for complete schema documentation.

## Theme Customization

The invoice template uses CSS variables for easy theming:

```css
:root {
  --brand-primary: #0891b2;
  --brand-secondary: #0e7490;
  --brand-accent: #06b6d4;
  --invoice-border: #1f2937;
  --invoice-header-bg: #f3f4f6;
}
```

## License

MIT License - FinePharma Wholesale
