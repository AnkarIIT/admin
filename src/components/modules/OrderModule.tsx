import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Printer,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  Send,
  DollarSign,
  User,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Order, OrderStatus } from '../../types';

export const OrderModule: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    processRefund,
    addOrderNote,
    setPrintingOrder,
    searchQuery,
  } = useAdmin();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('Customer return request');

  // New Note State
  const [noteContent, setNoteContent] = useState('');
  const [isCustomerVisible, setIsCustomerVisible] = useState(false);

  // Tracking Modal
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('FedEx Express');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || o.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenRefund = (order: Order) => {
    setSelectedOrder(order);
    setRefundAmount(order.total);
    setRefundModalOpen(true);
  };

  const handleProcessRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    processRefund(selectedOrder.id, refundAmount, refundReason);
    setRefundModalOpen(false);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !noteContent.trim()) return;
    addOrderNote(selectedOrder.id, noteContent, isCustomerVisible);
    setNoteContent('');
  };

  const handleUpdateTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, 'Shipped', trackingNumber, carrier);
    setTrackingModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Order & Fulfillment Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track order lifecycle, print commercial packing slips, process returns and issue refunds
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium px-2">
          {filteredOrders.length} order(s) found
        </span>
      </div>

      {/* Grid: Orders List (Left) + Order Detail Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Table Column */}
        <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {ord.id}
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{ord.customerName}</p>
                        <p className="text-[10px] text-slate-400">{ord.items.length} item(s)</p>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white">
                        ₹{ord.total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            ord.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : ord.orderStatus === 'Shipped'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              : ord.orderStatus === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintingOrder(ord);
                          }}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Print Invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Order Details Panel */}
        {selectedOrder && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 text-xs">
            {/* Header & Status Change */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                  {selectedOrder.id}
                </span>
                <p className="text-[11px] text-slate-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>

              <button
                onClick={() => setPrintingOrder(selectedOrder)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer className="h-3.5 w-3.5" /> Print Invoice
              </button>
            </div>

            {/* Status Change Bar */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Update Status Timeline</label>
              <div className="flex flex-wrap gap-1.5">
                {(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      if (st === 'Shipped') {
                        setTrackingModalOpen(true);
                      } else {
                        updateOrderStatus(selectedOrder.id, st);
                      }
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      selectedOrder.orderStatus === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Refund Button */}
            {selectedOrder.paymentStatus !== 'Refunded' && (
              <button
                onClick={() => handleOpenRefund(selectedOrder)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2 font-bold text-rose-600 hover:bg-rose-100/80 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
              >
                <RotateCcw className="h-4 w-4" /> Process Refund & Return
              </button>
            )}

            {/* Customer Info */}
            <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/50 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" /> {selectedOrder.customerName}
              </p>
              <p className="text-slate-500">{selectedOrder.customerEmail} • {selectedOrder.customerPhone}</p>
              <p className="text-slate-500 flex items-center gap-1 pt-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}
              </p>
            </div>

            {/* Line Items List */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Order Line Items</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-400">SKU: {item.sku} • Qty: {item.quantity}</p>
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Order Notes
              </h4>

              <form onSubmit={handleAddNoteSubmit} className="space-y-2 mb-3">
                <textarea
                  rows={2}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add internal staff note or customer update..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <input
                      type="checkbox"
                      checked={isCustomerVisible}
                      onChange={(e) => setIsCustomerVisible(e.target.checked)}
                      className="rounded"
                    />
                    Visible to Customer
                  </label>
                  <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1 font-bold text-white hover:bg-indigo-700">
                    Save Note
                  </button>
                </div>
              </form>

              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {selectedOrder.notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-slate-50 p-2 text-[11px] dark:bg-slate-800/60">
                    <div className="flex justify-between text-slate-400 font-semibold text-[10px]">
                      <span>{n.author} ({n.isCustomerVisible ? 'Customer Visible' : 'Internal'})</span>
                      <span>{n.createdAt}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Process Return & Refund</h3>
            <form onSubmit={handleProcessRefundSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Refund Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedOrder.total}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Return Reason</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white">
                  Issue Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Dispatch Order & Add Tracking</h3>
            <form onSubmit={handleUpdateTrackingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="FedEx Express">FedEx Express</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="UPS Ground">UPS Ground</option>
                  <option value="BlueDart Air">BlueDart Air</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Tracking Number</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="TRK-882103-US"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTrackingModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Confirm Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
