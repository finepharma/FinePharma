/**
 * Invoice Template Component - FinePharma Wholesale
 * 
 * Professional GST invoice template with:
 * - Company branding with logo placeholder
 * - Customer details block
 * - Product table with all required fields
 * - Tax calculations (CGST/SGST)
 * - Subtotal, discount, final amount
 * - Terms & conditions
 * - Bank details
 * - Signature area
 * 
 * Theme variables for easy color customization
 */

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileText } from 'lucide-react';

/**
 * Invoice Template Component
 * 
 * @param {Object} invoice - Invoice data from Firestore
 * @param {Object} company - Company details
 * @param {Function} onPrint - Print handler
 * @param {Function} onDownloadPDF - PDF download handler
 */
const InvoiceTemplate = ({ 
  invoice, 
  company = {},
  onPrint,
  onDownloadPDF 
}) => {
  const invoiceRef = useRef(null);

  // Default company details
  const companyDetails = {
    name: company.name || 'FINE PHARMA',
    address1: company.address1 || 'LGF 6 JEEVANDAAN PLAZA TAKIYA DHAMI',
    address2: company.address2 || 'SHA OLD MEDICIN MKT AMINABAD LUCKNOW',
    phone: company.phone || '+91 1234567890',
    email: company.email || 'support@finepharma.com',
    gstNo: company.gstNo || '09ABKPH1565J1ZF',
    dlNo: company.dlNo || 'UP 3220B004177 UP 3221B004160',
    udyam: company.udyam || 'UDYAM-UP-50-0074700',
    bankName: company.bankName || 'CANARA BANK',
    bankAccount: company.bankAccount || 'XXXXXXXXXX',
    bankIfsc: company.bankIfsc || 'CNRBXXXXXXXX',
    ...company
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate totals
  const subtotal = invoice?.subtotal || 0;
  const discount = invoice?.discount || 0;
  const taxableAmount = subtotal - discount;
  const cgst = invoice?.tax || 0;
  const sgst = invoice?.tax || 0;
  const finalAmount = invoice?.finalAmount || 0;

  // Convert number to words (simplified)
  const numberToWords = (num) => {
    // This is a simplified version - in production, use a proper library
    return `Rs. ${num.toFixed(2)} Only`;
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 justify-end print:hidden">
        <Button variant="outline" onClick={onPrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button onClick={onDownloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Invoice Content */}
      <div 
        ref={invoiceRef}
        className="bg-white border-2 border-gray-800 p-6 max-w-4xl mx-auto"
        style={{ 
          '--brandPrimary': 'var(--brand-primary, #0891b2)',
          '--brandSecondary': 'var(--brand-secondary, #0e7490)',
          '--accent': 'var(--accent-color, #06b6d4)',
          '--border': 'var(--border-color, #1f2937)',
          '--headerBg': 'var(--header-bg, #f3f4f6)'
        }}
      >
        {/* Header Section */}
        <div className="border-2 border-gray-800">
          <div className="grid grid-cols-3 divide-x-2 divide-gray-800">
            {/* Company Details */}
            <div className="p-4">
              <h1 className="text-xl font-bold text-gray-900 uppercase">{companyDetails.name}</h1>
              <p className="text-xs text-gray-700 mt-1">{companyDetails.address1}</p>
              <p className="text-xs text-gray-700">{companyDetails.address2}</p>
              <p className="text-xs text-gray-700 mt-1">Phone: {companyDetails.phone}</p>
              <p className="text-xs text-gray-700">{companyDetails.udyam}</p>
            </div>

            {/* Invoice Meta */}
            <div className="p-4 text-sm">
              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-gray-600">Book No.:</span>
                <span className="font-medium">0017</span>
                <span className="text-gray-600">Inv. No.:</span>
                <span className="font-medium">{invoice?.invoiceId || 'N/A'}</span>
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formatDate(invoice?.generatedAt)}</span>
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {invoice?.generatedAt?.toDate?.().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) || 'N/A'}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-4 text-sm">
              <p className="font-medium text-gray-900">M/s {invoice?.customerName || 'Customer'}</p>
              <p className="text-xs text-gray-700 mt-1">{invoice?.customerAddress || ''}</p>
              <p className="text-xs text-gray-700 mt-1">{invoice?.customerEmail || ''}</p>
            </div>
          </div>

          {/* License Numbers */}
          <div className="grid grid-cols-3 divide-x-2 divide-gray-800 border-t-2 border-gray-800">
            <div className="p-2 text-xs">
              <span className="text-gray-600">DL No.: </span>
              <span className="font-medium">{companyDetails.dlNo}</span>
            </div>
            <div className="p-2 text-center">
              <h2 className="text-lg font-bold text-gray-900">GST INVOICE</h2>
            </div>
            <div className="p-2 text-xs text-right">
              <span className="text-gray-600">GST No.: </span>
              <span className="font-medium">{companyDetails.gstNo}</span>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="border-x-2 border-b-2 border-gray-800 mt-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-800">
                <th className="border-r border-gray-400 px-2 py-2 w-8">Sr.</th>
                <th className="border-r border-gray-400 px-2 py-2 text-left">Description Of Goods</th>
                <th className="border-r border-gray-400 px-2 py-2">COMP</th>
                <th className="border-r border-gray-400 px-2 py-2">QTY</th>
                <th className="border-r border-gray-400 px-2 py-2">MRP</th>
                <th className="border-r border-gray-400 px-2 py-2">RATE</th>
                <th className="border-r border-gray-400 px-2 py-2">DISC%</th>
                <th className="border-r border-gray-400 px-2 py-2">HSN</th>
                <th className="border-r border-gray-400 px-2 py-2">GST%</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice?.items || []).map((item, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="border-r border-gray-300 px-2 py-2 text-center">{index + 1}</td>
                  <td className="border-r border-gray-300 px-2 py-2">{item.name}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">{item.company || '-'}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">{item.qty}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-right">{formatCurrency(item.mrp || item.price)}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-right">{formatCurrency(item.rate || item.price)}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">{item.discount || '0.00'}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">{item.hsn || '3004'}</td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center">{item.gstRate || '5.00'}</td>
                  <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.qty * (item.rate || item.price))}</td>
                </tr>
              ))}
              
              {/* Empty rows for visual balance */}
              {Array.from({ length: Math.max(0, 5 - (invoice?.items?.length || 0)) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-gray-300">
                  <td className="border-r border-gray-300 px-2 py-4 text-center">{ (invoice?.items?.length || 0) + i + 1 }</td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="border-r border-gray-300 px-2 py-4"></td>
                  <td className="px-2 py-4"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-x-2 border-b-2 border-gray-800">
          <div className="grid grid-cols-2">
            {/* Left - QR Code placeholder */}
            <div className="p-4 border-r border-gray-400">
              <p className="text-xs text-gray-600">E INVOICE QR CODE ======&gt;</p>
              <p className="text-xs text-gray-500 mt-2">IRN NO:</p>
              <p className="text-xs text-gray-500">ACK NO:</p>
            </div>

            {/* Right - Calculations */}
            <div className="p-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sub Total:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST {invoice?.taxRate || 2.5}%:</span>
                  <span className="font-medium">{formatCurrency(sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST {invoice?.taxRate || 2.5}%:</span>
                  <span className="font-medium">{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Roundoff:</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-400 pt-2 mt-2">
                  <span className="font-bold text-gray-900">GRAND TOTAL:</span>
                  <span className="font-bold text-lg">{formatCurrency(finalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="border-x-2 border-b-2 border-gray-800 p-3">
          <p className="text-sm">
            <span className="text-gray-600">Rs. </span>
            <span className="font-medium">{numberToWords(finalAmount)}</span>
          </p>
        </div>

        {/* Footer Section */}
        <div className="border-x-2 border-b-2 border-gray-800">
          <div className="grid grid-cols-3 divide-x-2 divide-gray-800">
            {/* Terms & Conditions */}
            <div className="p-4 text-xs">
              <h4 className="font-bold text-gray-900 mb-2">Terms & Conditions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>Bills not paid due date will attract 24% interest.</li>
                <li>All disputes subject to Jurisdiction only.</li>
                <li>Prescribed Sales Tax declaration will be given.</li>
              </ol>
            </div>

            {/* Bank Details */}
            <div className="p-4 text-xs">
              <h4 className="font-bold text-gray-900 mb-2">BANK DETAILS</h4>
              <div className="space-y-1">
                <p><span className="text-gray-600">BANK NAME:</span> {companyDetails.bankName}</p>
                <p><span className="text-gray-600">BANK A/C NO:</span> {companyDetails.bankAccount}</p>
                <p><span className="text-gray-600">BANK IFSC CODE:</span> {companyDetails.bankIfsc}</p>
              </div>
            </div>

            {/* Signature */}
            <div className="p-4 text-center">
              <p className="text-xs text-gray-600 mb-8">For {companyDetails.name}</p>
              <div className="mt-12">
                <p className="text-xs text-gray-500 border-t border-gray-400 inline-block pt-1">
                  Authorised signatory
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex justify-center print:hidden">
          <Badge 
            className={
              invoice?.status === 'paid' ? 'bg-green-100 text-green-700 text-sm px-4 py-1' :
              invoice?.status === 'pending' ? 'bg-amber-100 text-amber-700 text-sm px-4 py-1' :
              'bg-gray-100 text-gray-700 text-sm px-4 py-1'
            }
          >
            Status: {invoice?.status?.toUpperCase() || 'PENDING'}
          </Badge>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;
