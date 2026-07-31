import React, { useState } from 'react';
import {
  Boxes,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  Plus,
  Minus,
  RefreshCw,
  ArrowRightLeft,
  History,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { InventoryItem, StockAdjustmentLog } from '../../types';

export const InventoryModule: React.FC = () => {
  const {
    inventoryItems,
    warehouses,
    stockLogs,
    adjustStock,
    transferStock,
    searchQuery,
  } = useAdmin();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<InventoryItem | null>(null);
  const [changeAmount, setChangeAmount] = useState<number>(10);
  const [reason, setReason] = useState<StockAdjustmentLog['reason']>('Restock');

  // Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
  const [toWarehouseId, setToWarehouseId] = useState<string>(warehouses[1]?.id || 'wh-2');
  const [transferQty, setTransferQty] = useState<number>(5);

  const filteredInventory = inventoryItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWh = selectedWarehouse === 'All' || item.warehouseId === selectedWarehouse;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;

    return matchesSearch && matchesWh && matchesStatus;
  });

  const lowStockAlerts = inventoryItems.filter(
    (item) => item.status === 'Low Stock' || item.status === 'Out of Stock'
  );

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    adjustStock(targetItem.productId, targetItem.warehouseId, changeAmount, reason);
    setAdjustModalOpen(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem) return;
    transferStock(transferItem.productId, transferItem.warehouseId, toWarehouseId, transferQty);
    setTransferModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-100">
        <div>
          <p className="text-sm font-extrabold">Not Connected to a warehouse/inventory backend</p>
          <p className="text-xs opacity-80">This tab is a demo. Stock levels are not stored in the database and will reset on refresh.</p>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Inventory & Warehouse Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time multi-warehouse stock levels, reorder threshold alerts, and inter-facility inventory transfers
          </p>
        </div>
      </div>

      {/* Low Stock Persistent Alert Banner */}
      {lowStockAlerts.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold">Low Inventory Warning</p>
              <p className="text-[11px] opacity-90">
                {lowStockAlerts.length} SKU(s) have fallen below defined reorder points or are out of stock.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatus('Low Stock')}
            className="rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-amber-600 text-xs shrink-0"
          >
            View Low Stock SKUs
          </button>
        </div>
      )}

      {/* Warehouse Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {warehouses.map((wh) => {
          const itemsInWh = inventoryItems.filter((i) => i.warehouseId === wh.id);
          const totalUnits = itemsInWh.reduce((sum, i) => sum + i.quantity, 0);

          return (
            <div
              key={wh.id}
              className={`rounded-2xl border p-4 transition-all ${
                wh.isPrimary
                  ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/30'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {wh.code} {wh.isPrimary && '• Primary Hub'}
                </span>
                <WarehouseIcon className="h-4 w-4 text-slate-400" />
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{wh.name}</h3>
              <p className="text-xs text-slate-500">{wh.location}</p>

              <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-xs">
                <span className="text-slate-500">Total Units:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{totalUnits} items</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="All">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredInventory.length} inventory records
        </span>
      </div>

      {/* Inventory Items Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Warehouse Hub</th>
                <th className="py-3 px-3">Available Qty</th>
                <th className="py-3 px-3">Reorder Threshold</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{item.productName}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">{item.sku}</td>
                  <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">{item.warehouseName}</td>
                  <td className="py-3.5 px-3 font-black text-sm text-slate-900 dark:text-white">{item.quantity}</td>
                  <td className="py-3.5 px-3 text-slate-500">{item.reorderPoint} units</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                        item.status === 'In Stock'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'Low Stock'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setTargetItem(item);
                          setChangeAmount(10);
                          setAdjustModalOpen(true);
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        Adjust Stock
                      </button>
                      <button
                        onClick={() => {
                          setTransferItem(item);
                          setTransferModalOpen(true);
                        }}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Transfer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && targetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Adjust Inventory Stock ({targetItem.productName})
            </h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Adjustment Delta (+ to add, - to deduct)</label>
                <input
                  type="number"
                  required
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(parseInt(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-extrabold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Reason Log</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Restock">Restock Shipment</option>
                  <option value="Damaged">Damaged / Written Off</option>
                  <option value="Physical Audit">Physical Audit Correction</option>
                  <option value="Return">Customer Return</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {transferModalOpen && transferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Inter-Warehouse Stock Transfer</h3>
            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <p className="text-slate-500">From: <strong>{transferItem.warehouseName}</strong></p>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Destination Warehouse</label>
                <select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  {warehouses
                    .filter((w) => w.id !== transferItem.warehouseId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Quantity to Transfer</label>
                <input
                  type="number"
                  min="1"
                  max={transferItem.quantity}
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
