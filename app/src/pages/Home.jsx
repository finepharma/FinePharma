/**
 * Home Page - FinePharma Wholesale
 * 
 * Main landing page for customers, also accessible to staff and admin.
 * Features:
 * - Welcome panel with user name
 * - Product search
 * - Category filters
 * - Featured products grid
 * - Stock availability indicators
 * - Quick order button (customers only)
 * - Responsive design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToActiveProducts, 
  getProductCategories, 
  searchProducts 
} from '../services/productService';
import { subscribeToCustomerOrders } from '../services/orderService';
import { logoutUser } from '../services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { 
  Search, 
  ShoppingCart, 
  Package, 
  LogOut, 
  User, 
  Pill,
  TrendingUp,
  ClipboardList,
  IndianRupee,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user, userData, logout, isCustomer, isStaff, isAdmin } = useAuth();
  
  // Data state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [orders, setOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cart, setCart] = useState([]);

  /**
   * Subscribe to products and orders on mount
   */
  useEffect(() => {
    setIsLoading(true);
    
    // Subscribe to active products
    const unsubscribeProducts = subscribeToActiveProducts((data) => {
      setProducts(data);
      setFilteredProducts(data);
      setIsLoading(false);
    });

    // Get product categories
    getProductCategories().then((cats) => {
      setCategories(['All', ...cats]);
    });

    // Subscribe to customer's orders (for stats)
    let unsubscribeOrders = () => {};
    if (user?.uid && isCustomer) {
      unsubscribeOrders = subscribeToCustomerOrders(user.uid, (data) => {
        setOrders(data);
      });
    }

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [user, isCustomer]);

  /**
   * Filter products based on search and category
   */
  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /**
   * Add product to cart
   */
  const addToCart = (product) => {
    if (!isCustomer) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + 1, product.stock) }
            : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  /**
   * Calculate stats
   */
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    cartItems: cart.reduce((sum, item) => sum + item.qty, 0)
  };

  /**
   * Get stock status color
   */
  const getStockStatus = (stock, threshold = 10) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (stock <= threshold) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  /**
   * Get role badge color
   */
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'staff': return 'bg-blue-100 text-blue-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <Spinner className="w-10 h-10 text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Top Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:block">
                FinePharma
              </span>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search medicines, products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
                  <Badge className={`text-xs ${getRoleBadgeColor(userData?.role)}`}>
                    {userData?.role}
                  </Badge>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              </div>

              {/* Cart - Customers only */}
              {isCustomer && (
                <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-gray-600" />
                  {stats.cartItems > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.cartItems}
                    </span>
                  )}
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{userData?.name}</p>
                  <Badge className={`text-xs ${getRoleBadgeColor(userData?.role)}`}>
                    {userData?.role}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <p className="text-gray-600">Welcome, {userData?.name}</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">
            Your Trusted B2B Medical Partner
          </h1>
          <p className="text-gray-500 mt-2">
            Quality pharmaceutical products at wholesale prices
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-pink-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
              <p className="text-gray-500">Total Products</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              <p className="text-gray-500">Your Orders</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <IndianRupee className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">₹{stats.totalSpent.toFixed(2)}</p>
              <p className="text-gray-500">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Package className="w-5 h-5 text-pink-600" />
              </div>
              <p className="font-medium text-gray-900">Browse Products</p>
            </CardContent>
          </Card>

          {isCustomer && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShoppingCart className="w-5 h-5 text-amber-600" />
                </div>
                <p className="font-medium text-gray-900">View Cart</p>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-medium text-gray-900">Order History</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-medium text-gray-900">My Profile</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
            <button className="text-teal-600 text-sm font-medium flex items-center hover:text-teal-700">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock, product.lowStockThreshold);
                
                return (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Product Image */}
                    <div className="h-40 bg-gray-100 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Pill className="w-12 h-12 text-gray-300" />
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">{product.category}</p>
                          <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <Badge className={`text-xs mb-3 ${stockStatus.color}`}>
                        {stockStatus.label}
                      </Badge>

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-lg font-bold text-gray-900">
                          ₹{product.wholesalePrice || product.price}
                        </span>
                        {product.wholesalePrice && product.price && (
                          <span className="text-sm text-gray-400 line-through">
                            ₹{product.price}
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={product.stock === 0 || !isCustomer}
                        onClick={() => addToCart(product)}
                        title={!isCustomer ? 'Only customers can order' : ''}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                  <Pill className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl">FinePharma</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted B2B partner for quality pharmaceutical products at wholesale prices.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Home</a></li>
                <li><a href="#" className="hover:text-white">Products</a></li>
                <li><a href="#" className="hover:text-white">Orders</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2025 FinePharma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
