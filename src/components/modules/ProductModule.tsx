import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Upload,
  Download,
  Image as ImageIcon,
  Tag as TagIcon,
  Globe,
  Layers,
  Video,
  CheckCircle,
  X,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Product, ProductVariant, SEOData, ProductSpecifications } from '../../types';
import { filesToMediaUrls, uploadFileToStorage } from '../../lib/mediaUpload';
import { DEFAULT_SPECS } from '../../api';

export const ProductModule: React.FC = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    addCategory,
    addToast,
    searchQuery,
  } = useAdmin();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    subcategory: '',
    sku: '',
    price: 99.99,
    compareAtPrice: 120.00,
    costPrice: 40.00,
    stock: 20,
    lowStockThreshold: 5,
    status: 'Active' as Product['status'],
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
    videoUrl: '',
    description: '',
    tags: ['Best Seller'],
    variants: [] as ProductVariant[],
    seo: {
      title: '',
      description: '',
      slug: '',
      keywords: ['gear', 'tech'],
    } as SEOData,
  });

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: categories[0]?.name || 'Electronics',
      subcategory: '',
      sku: 'SKU-' + Math.floor(100000 + Math.random() * 900000),
      price: 49.99,
      compareAtPrice: 59.99,
      costPrice: 20.00,
      stock: 30,
      lowStockThreshold: 5,
      status: 'Active',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
      videoUrl: '',
      description: 'High performance quality merchandise designed for long-lasting comfort.',
      tags: ['New Arrival'],
      variants: [],
      seo: {
        title: '',
        description: '',
        slug: '',
        keywords: ['lifestyle', 'gear'],
      },
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || '',
      sku: product.sku,
      price: product.price,
      compareAtPrice: product.compareAtPrice || 0,
      costPrice: product.costPrice,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      status: product.status,
      images: product.images,
      videoUrl: product.videoUrl || '',
      description: product.description,
      tags: product.tags,
      variants: product.variants,
      seo: product.seo,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const slug = formData.seo.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const title = formData.seo.title || `${formData.name} | Official Store`;
    const desc = formData.seo.description || formData.description.slice(0, 150);

    const productPayload = {
      ...formData,
      seo: {
        ...formData.seo,
        title,
        description: desc,
        slug,
      },
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload);
    }
    setIsAddModalOpen(false);
  };

  const updateSpecs = (patch: Partial<ProductSpecifications>) =>
    setFormData((prev) => ({ ...prev, specifications: { ...prev.specifications, ...patch } }));

  const handleProductImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const { urls, errors } = await filesToMediaUrls(files.slice(0, MAX_IMAGES), { types: ['image/'] });
    if (errors.length) {
      addToast({
        type: 'warning',
        title: 'Some files were skipped',
        message: errors.map((er) => `${er.fileName}: ${er.message}`).join('; '),
      });
    }
    if (!urls.length) {
      e.target.value = '';
      return;
    }
    setFormData((prev) => {
      const current = prev.images.filter(Boolean);
      const remaining = MAX_IMAGES - current.length;
      if (remaining <= 0) {
        addToast({ type: 'warning', title: 'Image limit reached', message: `A product can have up to ${MAX_IMAGES} images.` });
        return prev;
      }
      const add = urls.slice(0, remaining);
      if (urls.length > remaining) {
        addToast({ type: 'warning', title: 'Some images skipped', message: `Only ${remaining} more image(s) can be added (max ${MAX_IMAGES}).` });
      }
      return { ...prev, images: [...current, ...add] };
    });
    e.target.value = '';
  };

  const removeProductImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const setMainImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const arr = [...prev.images];
      const [img] = arr.splice(index, 1);
      arr.unshift(img);
      return { ...prev, images: arr };
    });
  };

  const handleProductVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith('video/')) {
        addToast({ type: 'error', title: 'Upload failed', message: 'Please choose a video file' });
        return;
      }
      const url = await uploadFileToStorage(file, true);
      setFormData({ ...formData, videoUrl: url });
      addToast({ type: 'success', title: 'Video attached', message: 'Product video uploaded.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    }
    e.target.value = '';
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName,
      slug: newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: newCatDesc,
    });
    setNewCatName('');
    setNewCatDesc('');
    setIsCategoryModalOpen(false);
  };

  const exportProductsCSV = () => {
    const headers = 'ID,Name,SKU,Category,Price ($),Cost ($),Stock,Status\n';
    const rows = products
      .map((p) => `"${p.id}","${p.name}","${p.sku}","${p.category}",${p.price},${p.costPrice},${p.stock},"${p.status}"`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-catalog-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    addToast({ type: 'success', title: 'Export Complete', message: 'Product catalog downloaded in CSV format.' });
  };

  const addVariantRow = () => {
    const newVariant: ProductVariant = {
      id: 'var-' + Date.now(),
      sku: `${formData.sku}-V${formData.variants.length + 1}`,
      size: 'M',
      color: 'Default',
      price: formData.price,
      stock: 10,
    };
    setFormData((prev) => ({ ...prev, variants: [...prev.variants, newVariant] }));
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Product Management & Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage variations, media assets, SEO metadata, and category trees ({products.length} total items)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <Layers className="h-4 w-4 text-indigo-500" /> Categories ({categories.length})
          </button>

          <button
            onClick={exportProductsCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Product
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredProducts.length} of {products.length} products
        </span>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Stock Level</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                        alt={p.name}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          ⭐ {p.rating} ({p.reviewCount} reviews) • {p.variants.length} variant(s)
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400">{p.sku}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">{p.category}</td>

                  <td className="py-3.5 px-3">
                    <div className="font-black text-slate-900 dark:text-white">${p.price.toFixed(2)}</div>
                    {p.compareAtPrice && (
                      <span className="text-[10px] text-slate-400 line-through">${p.compareAtPrice.toFixed(2)}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-extrabold ${p.stock <= p.lowStockThreshold ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {p.stock} units
                      </span>
                      {p.stock <= p.lowStockThreshold && p.stock > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Low
                        </span>
                      )}
                      {p.stock === 0 && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Out
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                        p.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.status === 'Draft'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreviewProduct(p)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Quick Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                        title="Edit Product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => duplicateProduct(p.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Stock Units</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Product Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Featured Image Upload */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Featured Image</label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Click to upload multiple images (up to {MAX_IMAGES}, max 30MB each) — front, back, side angles
                  </span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleProductImagesUpload} />
                </label>
                {formData.images[0] && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, images: [] })}
                    className="mt-2 text-xs font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Remove image
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-md hover:bg-indigo-700 cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Add Product Category</h3>
            <form onSubmit={handleAddCategorySubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white cursor-pointer">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Product Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex justify-between items-start mb-4">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                {previewProduct.category}
              </span>
              <button onClick={() => setPreviewProduct(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <img src={previewProduct.images[0]} alt={previewProduct.name} className="h-48 w-full rounded-2xl object-cover mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{previewProduct.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{previewProduct.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
              <span className="font-extrabold text-base text-slate-900 dark:text-white">${previewProduct.price.toFixed(2)}</span>
              <span className="font-bold text-emerald-600">{previewProduct.stock} units available</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
