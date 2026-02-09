/**
 * Invoice Generator Component - FinePharma Wholesale
 * 
 * Features:
 * - Generate invoices from orders
 * - View invoice preview
 * - Print invoice
 * - Download as PDF
 * - Role-based permissions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { generateInvoice, getInvoiceByOrderId } from '../../services/invoiceService';
import { getOrderById } from '../../services/orderService';
import { getUserById } from '../../services/userService';
import InvoiceTemplate from './InvoiceTemplate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Search, 
  Plus, 
  Printer, 
  Download, 
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Invoice Generator Component
 * 
 * @param {string} orderId - Optional order ID to auto-load
 * @param {Function} onBack - Callback to go back
 */
const InvoiceGenerator = ({ orderId: initialOrderId = null, onBack = null }) => {
  const navigate = useNavigate();
  const { user, userData, isAdmin, isStaff } = useAuth();
  const invoiceRef = useRef(null);
  
  // State
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Tax rate (CGST + SGST = 5% total)
  const TAX_RATE = 2.5; // 2.5% each for CGST and SGST

  /**
   * Load order data
   */
  const handleLoadOrder = async () => {
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Search for order
      const orderData = await getOrderById(orderId.trim());
      
      if (!orderData) {
        setError('Order not found');
        setIsLoading(false);
        return;
      }

      setOrder(orderData);

      // Load customer details
      const customerData = await getUserById(orderData.customerUid);
      setCustomer(customerData);

      // Check if invoice already exists
      const existingInv = await getInvoiceByOrderId(orderData.orderId);
      if (existingInv) {
        setExistingInvoice(existingInv);
        setGeneratedInvoice(existingInv);
      } else {
        setExistingInvoice(null);
        setGeneratedInvoice(null);
      }
    } catch (err) {
      setError('Error loading order: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate new invoice
   */
  const handleGenerateInvoice = async () => {
    if (!order) return;

    setIsGenerating(true);
    setError('');

    try {
      // Calculate totals
      const subtotal = order.items?.reduce((sum, item) => 
        sum + (item.qty * (item.price || 0)), 0
      ) || 0;

      const discount = 0; // Can be added later
      const taxableAmount = subtotal - discount;
      const taxAmount = (taxableAmount * (TAX_RATE * 2)) / 100; // Total 5% tax
      const finalAmount = taxableAmount + taxAmount;

      // Prepare invoice data
      const invoiceData = {
        orderId: order.orderId,
        orderDocId: order.id,
        customerUid: order.customerUid,
        customerName: customer?.name || 'Customer',
        customerEmail: customer?.email || '',
        customerAddress: '', // Can be extended
        items: order.items?.map(item => ({
          ...item,
          mrp: item.price,
          rate: item.price,
          discount: '0.00',
          hsn: '3004',
          gstRate: '5.00',
          company: item.company || '-'
        })) || [],
        subtotal,
        tax: taxAmount / 2, // Per tax (CGST/SGST)
        taxRate: TAX_RATE,
        discount,
        finalAmount,
        status: 'pending',
        generatedByUid: user.uid,
        generatedByName: userData?.name || 'Staff'
      };

      // Generate invoice
      const newInvoice = await generateInvoice(invoiceData);
      setGeneratedInvoice(newInvoice);
      setExistingInvoice(newInvoice);

    } catch (err) {
      setError('Error generating invoice: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Print invoice
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Download PDF
   */
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${generatedInvoice?.invoiceId || orderId}.pdf`);
    } catch (err) {
      setError('Error generating PDF: ' + err.message);
    }
  };

  // Auto-load if initialOrderId provided
  useEffect(() => {
    if (initialOrderId) {
      handleLoadOrder();
    }
  }, [initialOrderId]);

  // Company details
  const companyDetails = {
    name: 'FINE PHARMA',
    address1: 'LGF 6 JEEVANDAAN PLAZA TAKIYA DHAMI',
    address2: 'SHA OLD MEDICIN MKT AMINABAD LUCKNOW',
    phone: '+91 1234567890',
    email: 'support@finepharma.com',
    gstNo: '09ABKPH1565J1ZF',
    dlNo: 'UP 3220B004177 UP 3221B004160',
    udyam: 'UDYAM-UP-50-0074700',
    bankName: 'CANARA BANK',
    bankAccount: 'XXXXXXXXXX',
    bankIfsc: 'CNRBXXXXXXXX'
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Invoice Generator</h1>
        </div>
        
        {/* Role Badge */}
        <Badge className={isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
          {userData?.role}
        </Badge>
      </div>

      {/* Order Search */}
      {!initialOrderId && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Order ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Enter Order ID (e.g., FPW-2025-12345)"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLoadOrder()}
                  />
                  <Button onClick={handleLoadOrder} disabled={isLoading}>
                    {isLoading ? <Spinner className="w-4 h-4" /> : <Search className="w-4 h-4 mr-2" />}
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Order Details */}
      {order && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{order.orderId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{customer?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">₹{order.totalAmount?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className={
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }>
                  {order.status}
                </Badge>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Order Items</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-center p-2">Qty</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{item.name}</td>
                      <td className="text-center p-2">{item.qty}</td>
                      <td className="text-right p-2">₹{item.price?.toFixed(2)}</td>
                      <td className="text-right p-2">₹{(item.qty * item.price)?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Generate Invoice Button */}
            {!existingInvoice && (isAdmin || isStaff) && (
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600"
                >
                  {isGenerating ? (
                    <Spinner className="w-4 h-4 mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Generate Invoice
                </Button>
              </div>
            )}

            {existingInvoice && (
              <Alert className="mt-6 border-green-200 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Invoice already exists: <strong>{existingInvoice.invoiceId}</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice Preview */}
      {generatedInvoice && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Invoice Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          <div ref={invoiceRef}>
            <InvoiceTemplate 
              invoice={generatedInvoice}
              company={companyDetails}
              onPrint={handlePrint}
              onDownloadPDF={handleDownloadPDF}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;
