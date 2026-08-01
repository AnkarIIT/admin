import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Printer, X, Download, Store, Package, CheckCircle2 } from 'lucide-react';

export const InvoicePrinterModal: React.FC = () => {
  const { printingOrder, setPrintingOrder, settings, addToast } = useAdmin();

  if (!printingOrder) return null;

  const handlePrint = () => {
    window.print();
    addToast({ type: 'success', title: 'Invoice Sent to Printer', message: `Invoice for ${printingOrder.id} ready.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="m-auto w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Action Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Official Commercial Invoice & Packing Slip
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
            <button
              onClick={() => setPrintingOrder(null)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-invoice" className="p-4 sm:p-8 text-slate-900 dark:text-slate-100 font-sans">
          {/* Header Barcode & Company Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-6 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {settings.storeName}
                  </h1>
                  <p className="text-xs text-slate-500">{settings.address}</p>
                  <p className="text-xs text-slate-500">{settings.contactEmail} • {settings.supportPhone}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-0 text-left sm:text-right">
              <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase tracking-widest">
                INVOICE #{printingOrder.id}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(printingOrder.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-500">
                Payment Status: <strong className="text-emerald-600 dark:text-emerald-400">{printingOrder.paymentStatus}</strong> ({printingOrder.paymentMethod})
              </p>
            </div>
          </div>

          {/* Addresses Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-2">Billed To</h4>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{printingOrder.customerName}</p>
              <p>{printingOrder.billingAddress.street}</p>
              <p>{printingOrder.billingAddress.city}, {printingOrder.billingAddress.state} {printingOrder.billingAddress.zip}</p>
              <p>{printingOrder.billingAddress.country}</p>
              <p className="text-slate-500 mt-1">{printingOrder.customerEmail} • {printingOrder.customerPhone}</p>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-2">Shipment Details</h4>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{printingOrder.customerName}</p>
              <p>{printingOrder.shippingAddress.street}</p>
              <p>{printingOrder.shippingAddress.city}, {printingOrder.shippingAddress.state} {printingOrder.shippingAddress.zip}</p>
              <p>{printingOrder.shippingAddress.country}</p>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <p>Carrier: <strong>{printingOrder.carrier || 'FedEx Standard'}</strong></p>
                <p>Tracking #: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{printingOrder.trackingNumber || 'TRK-PENDING'}</strong></p>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left text-xs border-collapse mb-6">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2">Item Description</th>
                <th className="py-2">SKU</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {printingOrder.items.map((item, idx) => (
                <tr key={idx} className="py-2">
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                  <td className="py-3 text-slate-500 font-mono">{item.sku}</td>
                  <td className="py-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 text-right">₹{item.price.toFixed(2)}</td>
                  <td className="py-3 text-right font-bold">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>₹{printingOrder.subtotal.toFixed(2)}</span>
              </div>
              {printingOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span>-₹{printingOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated Tax</span>
                <span>₹{printingOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Shipping Fee</span>
                <span>₹{printingOrder.shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-base text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-indigo-600 dark:text-indigo-400">₹{printingOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Barcode & Footer note */}
          <div className="mt-8 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Thank you for shopping with {settings.storeName}!</span>
            </div>
            <div className="font-mono text-center sm:text-right mt-2 sm:mt-0 tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
              ||| |||| | |||||| | ||| {printingOrder.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
