/**
 * Admin Dashboard - FinePharma Wholesale
 * 
 * Full-featured admin dashboard with:
 * - Dashboard overview with widgets
 * - Product management (CRUD)
 * - User management
 * - Orders management
 * - Invoices
 * - Stock alerts
 * - Reports
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { subscribeToAllUsers, getUserCounts, updateUserRole, updateUserStatus } from '../services/userService';
import { 
  subscribeToAllProducts, 
  createProduct, 
  updateProduct, 
  softDeleteProduct,
  getProductCounts,
  subscribeToLowStockProducts
} from '../services/productService';
import { subscribeToAllOrders, getOrderStatistics } from '../services/orderService';
import { subscribeToAllInvoices, getInvoiceStatistics } from '../services/invoiceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  FileText, 
  AlertTriangle,
  BarChart3,
  LogOut,
  Home,
  Plus,
  Edit2,
  Trash2,
  Search,
  Menu,
  X,
  TrendingUp,
  IndianRupee,
  User
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userData, logout } = useAuth();
  
  // Data state
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stats, setStats] = useState({
    products: { total: 0, active: 0, inactive: 0, lowStock: 0 },
    users: { total: 0, admin: 0, staff: 0, customer: 0 },
    orders: { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, todayRevenue: 0 },
    invoices: { total: 0, totalRevenue: 0, todayRevenue: 0 }
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    price: '',
    wholesalePrice: '',
    stock: '',
    lowStockThreshold: '10',
    imageUrl: ''
  });

  /**
   * Subscribe to all data on mount
   */
  useEffect(() => {
    setIsLoading(true);
    
    // Subscribe to users
    const unsubscribeUsers = subscribeToAllUsers((data) => {
      setUsers(data);
    });

    // Subscribe to products
    const unsubscribeProducts = subscribeToAllProducts((data) => {
      setProducts(data);
    });

    // Subscribe to orders
    const unsubscribeOrders = subscribeToAllOrders((data) => {
      setOrders(data);
    });

    // Subscribe to invoices
    const unsubscribeInvoices = subscribeToAllInvoices((data) => {
      setInvoices(data);
    });

    // Subscribe to low stock
    const unsubscribeLowStock = subscribeToLowStockProducts((data) => {
      setLowStockItems(data);
    });

    // Load stats
    loadStats();

    setIsLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeInvoices();
      unsubscribeLowStock();
    };
  }, []);

  const loadStats = async () => {
    const [productCounts, userCounts, orderStats, invoiceStats] = await Promise.all([
      getProductCounts(),
      getUserCounts(),
      getOrderStatistics(),
      getInvoiceStatistics()
    ]);
    
    setStats({
      products: productCounts,
      users: userCounts,
      orders: orderStats,
      invoices: invoiceStats
    });
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * Save product (create or update)
   */
  const handleSaveProduct = async () => {
    try {
      const productData = {
        name: productForm.name,
        category: productForm.category,
        price: parseFloat(productForm.price),
        wholesalePrice: parseFloat(productForm.wholesalePrice),
        stock: parseInt(productForm.stock),
        lowStockThreshold: parseInt(productForm.lowStockThreshold) || 10,
        imageUrl: productForm.imageUrl,
        status: 'active'
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData, user.uid);
      } else {
        await createProduct(productData);
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: '',
        price: '',
        wholesalePrice: '',
        stock: '',
        lowStockThreshold: '10',
        imageUrl: ''
      });
    } catch (error) {
      alert('Error saving product: ' + error.message);
    }
  };

  /**
   * Edit product
   */
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      category: product.category || '',
      price: product.price?.toString() || '',
      wholesalePrice: product.wholesalePrice?.toString() || '',
      stock: product.stock?.toString() || '',
      lowStockThreshold: product.lowStockThreshold?.toString() || '10',
      imageUrl: product.imageUrl || ''
    });
    setShowProductModal(true);
  };

  /**
   * Delete product (soft delete)
   */
  const handleDeleteProduct = async (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await softDeleteProduct(productId, user.uid);
      } catch (error) {
        alert('Error deleting product: ' + error.message);
      }
    }
  };

  /**
   * Update user role
   */
  const handleUpdateUserRole = async (userId, newRole) => {
    // Prevent admin from removing their own admin role
    if (userId === user.uid && newRole !== 'admin') {
      alert('You cannot remove your own admin role');
      return;
    }
    
    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      alert('Error updating role: ' + error.message);
    }
  };

  /**
   * Toggle user status
   */
  const handleToggleUserStatus = async (targetUserId, currentStatus) => {
    // Prevent admin from disabling themselves
    if (targetUserId === user.uid) {
      alert('You cannot disable your own account');
      return;
    }
    
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await updateUserStatus(targetUserId, newStatus);
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  /**
   * Filter data based on search
   */
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="w-10 h-10 text-teal-600" />
      </div>
    );
  }

  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Manage Products', icon: Package },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'stock-alerts', label: 'Stock Alerts', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">FinePharma</h1>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => navigate('/home')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Go to Home Page</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find(m => m.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
                <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Products</p>
                        <p className="text-2xl font-bold">{stats.products.total}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Users</p>
                        <p className="text-2xl font-bold">{stats.users.total}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Orders</p>
                        <p className="text-2xl font-bold">{stats.orders.total}</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Low Stock Items</p>
                        <p className="text-2xl font-bold text-red-600">{stats.products.lowStock}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's Sales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Today's Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Today's Orders</p>
                      <p className="text-2xl font-bold">{stats.orders.todayTotal || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Today's Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{(stats.orders.todayRevenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Pending Orders</p>
                      <p className="text-2xl font-bold text-amber-600">{stats.orders.pending || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      name: '',
                      category: '',
                      price: '',
                      wholesalePrice: '',
                      stock: '',
                      lowStockThreshold: '10',
                      imageUrl: ''
                    });
                    setShowProductModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>₹{product.wholesalePrice}</span>
                            <span className="text-xs text-gray-400 line-through">
                              ₹{product.price}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={product.stock <= (product.lowStockThreshold || 10) ? 'text-red-600 font-medium' : ''}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.uid}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleUpdateUserRole(u.uid, value)}
                            disabled={u.uid === user.uid}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className={u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(u.uid, u.status)}
                            disabled={u.uid === user.uid}
                          >
                            {u.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderId}</TableCell>
                        <TableCell>{order.customerUid}</TableCell>
                        <TableCell>₹{order.totalAmount?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Stock Alerts Tab */}
          {activeTab === 'stock-alerts' && (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {lowStockItems.length} products are running low on stock
                </AlertDescription>
              </Alert>

              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((product) => (
                      <TableRow key={product.id} className={product.stock === 0 ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className={product.stock === 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}>
                          {product.stock}
                        </TableCell>
                        <TableCell>{product.lowStockThreshold || 10}</TableCell>
                        <TableCell>
                          <Badge className={product.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                            {product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Other tabs placeholder */}
          {['invoices'].includes(activeTab) && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Invoices module - See Invoice Generator component</p>
            </div>
          )}
        </main>
      </div>

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Product Name</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                placeholder="e.g., Tablets, Syrups"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (MRP)</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Wholesale Price</Label>
                <Input
                  type="number"
                  value={productForm.wholesalePrice}
                  onChange={(e) => setProductForm({ ...productForm, wholesalePrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={productForm.lowStockThreshold}
                  onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={productForm.imageUrl}
                onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct}>
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
