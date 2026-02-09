/**
 * Staff Dashboard - FinePharma Wholesale
 * 
 * Operational dashboard for staff members with:
 * - Overview widgets
 * - View products (read-only except stock)
 * - Update stock quantities
 * - Orders processing
 * - Customer list (read-only)
 * 
 * Staff CANNOT:
 * - Create/delete products
 * - Change prices
 * - Change product status
 * - Manage users
 * - Access admin modules
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { subscribeToAllUsers } from '../services/userService';
import { 
  subscribeToActiveProducts, 
  updateProductStock,
  getProductCounts 
} from '../services/productService';
import { 
  subscribeToAllOrders, 
  updateOrderStatus,
  getOrderStatistics 
} from '../services/orderService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  LogOut,
  Home,
  Search,
  Menu,
  X,
  Edit2,
  TrendingUp,
  AlertTriangle,
  Lock,
  User,
  CheckCircle2
} from 'lucide-react';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user, userData, logout } = useAuth();
  
  // Data state
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    products: { active: 0, lowStock: 0 },
    orders: { pending: 0, todayProcessed: 0 }
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stock update modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  /**
   * Subscribe to data on mount
   */
  useEffect(() => {
    setIsLoading(true);
    
    // Subscribe to active products
    const unsubscribeProducts = subscribeToActiveProducts((data) => {
      setProducts(data);
    });

    // Subscribe to orders
    const unsubscribeOrders = subscribeToAllOrders((data) => {
      setOrders(data);
    });

    // Subscribe to customers (users with role 'customer')
    const unsubscribeUsers = subscribeToAllUsers((data) => {
      const customersOnly = data.filter(u => u.role === 'customer');
      setCustomers(customersOnly);
    });

    // Load stats
    loadStats();

    setIsLoading(false);

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeUsers();
    };
  }, []);

  const loadStats = async () => {
    const [productCounts, orderStats] = await Promise.all([
      getProductCounts(),
      getOrderStatistics()
    ]);
    
    setStats({
      products: { 
        active: productCounts.active, 
        lowStock: productCounts.lowStock 
      },
      orders: { 
        pending: orderStats.pending,
        todayProcessed: orderStats.todayProcessed || 0
      }
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
   * Open stock update modal
   */
  const handleOpenStockModal = (product) => {
    setSelectedProduct(product);
    setNewStockValue(product.stock?.toString() || '0');
    setShowStockModal(true);
  };

  /**
   * Save stock update
   */
  const handleSaveStock = async () => {
    if (!selectedProduct) return;
    
    const stockValue = parseInt(newStockValue);
    if (isNaN(stockValue) || stockValue < 0) {
      alert('Please enter a valid stock quantity');
      return;
    }

    try {
      await updateProductStock(selectedProduct.id, stockValue, user.uid);
      setShowStockModal(false);
      setSelectedProduct(null);
      setNewStockValue('');
    } catch (error) {
      alert('Error updating stock: ' + error.message);
    }
  };

  /**
   * Update order status
   */
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus, 'staff');
    } catch (error) {
      alert('Error updating order: ' + error.message);
    }
  };

  /**
   * Get next status for order
   */
  const getNextStatus = (currentStatus) => {
    const flow = {
      'pending': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered'
    };
    return flow[currentStatus] || null;
  };

  /**
   * Filter data
   */
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Get stock status
   */
  const getStockStatus = (stock, threshold = 10) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (stock <= threshold) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="w-10 h-10 text-blue-600" />
      </div>
    );
  }

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'View Products', icon: Package },
    { id: 'orders', label: 'Orders Processing', icon: ShoppingCart },
    { id: 'customers', label: 'Customers List', icon: Users },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">FinePharma</h1>
                <p className="text-xs text-gray-400">Staff Panel</p>
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
                      ? 'bg-blue-600 text-white'
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
                  <Badge className="bg-blue-100 text-blue-700">Staff</Badge>
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
                          <p className="text-sm text-gray-500">Active Products</p>
                          <p className="text-2xl font-bold">{stats.products.active}</p>
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
                          <p className="text-sm text-gray-500">Low Stock Items</p>
                          <p className="text-2xl font-bold text-red-600">{stats.products.lowStock}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Pending Orders</p>
                          <p className="text-2xl font-bold text-amber-600">{stats.orders.pending}</p>
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
                          <p className="text-sm text-gray-500">Today's Processed</p>
                          <p className="text-2xl font-bold text-green-600">{stats.orders.todayProcessed}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => setActiveTab('products')}
                      >
                        <Package className="w-6 h-6" />
                        <span>Update Stock</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => setActiveTab('orders')}
                      >
                        <ShoppingCart className="w-6 h-6" />
                        <span>Process Orders</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2"
                        onClick={() => setActiveTab('customers')}
                      >
                        <Users className="w-6 h-6" />
                        <span>View Customers</span>
                      </Button>
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
                  
                  {/* Disabled buttons with tooltips for restricted actions */}
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button disabled variant="outline">
                          <Package className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Admin only</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="bg-white rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>
                              <span className={product.stock <= (product.lowStockThreshold || 10) ? 'text-red-600 font-medium' : ''}>
                                {product.stock}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={stockStatus.color}>
                                {stockStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStockModal(product)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Update Stock
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const nextStatus = getNextStatus(order.status);
                        return (
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
                              {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateOrderStatus(order.id, nextStatus)}
                                >
                                  Mark as {nextStatus}
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-sm">No action</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div className="space-y-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
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
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.uid}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>
                            <Badge className={customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" disabled>
                                  <Lock className="w-4 h-4 mr-1" />
                                  View Details
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Read-only access</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Stock Update Modal */}
        <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Product</Label>
                <p className="font-medium">{selectedProduct?.name}</p>
              </div>
              <div>
                <Label>Current Stock</Label>
                <p>{selectedProduct?.stock}</p>
              </div>
              <div>
                <Label>New Stock Quantity</Label>
                <Input
                  type="number"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(e.target.value)}
                  placeholder="Enter new stock quantity"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStockModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStock}>
                Update Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default StaffDashboard;
