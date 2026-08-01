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
  Star,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Product, ProductVariant, SEOData } from '../../types';
import { fileToDataUrl } from '../../lib/imageUpload';

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
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Product Images
  const MAX_IMAGES = 6;
  const [imageUrl, setImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');

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

  const handleProductImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const current = formData.images.filter(Boolean);
      const remaining = MAX_IMAGES - current.length;
      if (remaining <= 0) {
        addToast({ type: 'warning', title: 'Image limit reached', message: `A product can have up to ${MAX_IMAGES} images.` });
        return;
      }
      const toAdd = files.slice(0, remaining);
      const dataUrls = await Promise.all(toAdd.map((f) => fileToDataUrl(f)));
      setFormData({ ...formData, images: [...current, ...dataUrls] });
      if (files.length > remaining) {
        addToast({ type: 'warning', title: 'Some images skipped', message: `Only ${remaining} more image(s) can be added (max ${MAX_IMAGES}).` });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    }
    e.target.value = '';
  };

  const removeProductImage = (index: number) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  const setMainImage = (index: number) => {
    if (index === 0) return;
    const arr = [...formData.images];
    const [img] = arr.splice(index, 1);
    arr.unshift(img);
    setFormData({ ...formData, images: arr });
  };

  const addImageByUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (formData.images.length >= MAX_IMAGES) {
      addToast({ type: 'warning', title: 'Image limit reached', message: `A product can have up to ${MAX_IMAGES} images.` });
      return;
    }
    setFormData({ ...formData, images: [...formData.images, url] });
    setImageUrl('');
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!formData.tags.includes(t)) {
      setFormData({ ...formData, tags: [...formData.tags, t] });
    }
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((x) => x !== t) });
  };

  const updateVariantRow = (index: number, field: keyof ProductVariant, value: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => {
        if (i !== index) return v;
        return field === 'price' || field === 'stock'
          ? { ...v, [field]: parseFloat(value) || 0 }
          : { ...v, [field]: value };
      }),
    }));
  };

  const removeVariantRow = (index: number) => {
    setFormData((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };

  const updateSeo = (field: keyof SEOData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, seo: { ...prev.seo, [field]: value } }));
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
                        onClick={() => {
                          setPreviewProduct(p);
                          setPreviewImageIndex(0);
                        }}
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
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Subcategory</label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g. Wireless Headphones"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="font-bold text-slate-700 dark:text-slate-300">Compare At Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.compareAtPrice || ''}
                    onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Stock Units</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Product['status'] })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
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

              {/* Product Images (Multiple) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Product Images
                  <span
                    className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                      formData.images.length >= MAX_IMAGES
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}
                  >
                    {formData.images.length}/{MAX_IMAGES}
                  </span>
                </label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Click to upload multiple images (up to {MAX_IMAGES}) — front, back, side angles
                  </span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleProductImagesUpload} />
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="...or paste an image URL to add another angle"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addImageByUrl}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-950/50 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {formData.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {formData.images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`group relative overflow-hidden rounded-xl border-2 ${
                          idx === 0 ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <img src={img} alt={`Product image ${idx + 1}`} className="h-20 w-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                            Main
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around bg-slate-900/70 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setMainImage(idx)}
                            disabled={idx === 0}
                            title="Set as main image"
                            className="p-0.5 text-white hover:text-indigo-300 disabled:opacity-30 cursor-pointer"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProductImage(idx)}
                            title="Remove image"
                            className="p-0.5 text-white hover:text-rose-300 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Video URL (optional)</label>
                <input
                  type="text"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Tags</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Type a tag and press Enter"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-950/50 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {formData.tags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-500 cursor-pointer">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Variants */}
              <div>
                <label className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  Variants
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Variant
                  </button>
                </label>
                {formData.variants.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {formData.variants.map((v, idx) => (
                      <div
                        key={v.id}
                        className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        <input
                          type="text"
                          value={v.size || ''}
                          onChange={(e) => updateVariantRow(idx, 'size', e.target.value)}
                          placeholder="Size"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={v.color || ''}
                          onChange={(e) => updateVariantRow(idx, 'color', e.target.value)}
                          placeholder="Color"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={v.price}
                          onChange={(e) => updateVariantRow(idx, 'price', e.target.value)}
                          placeholder="Price"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => updateVariantRow(idx, 'stock', e.target.value)}
                            placeholder="Stock"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariantRow(idx)}
                            className="shrink-0 text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">No variants yet. Add sizes/colors if the product has variations.</p>
                )}
              </div>

              {/* SEO Metadata */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">SEO Metadata</label>
                <div className="mt-1 space-y-3">
                  <input
                    type="text"
                    value={formData.seo.title}
                    onChange={(e) => updateSeo('title', e.target.value)}
                    placeholder="SEO Title (defaults to product name)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    value={formData.seo.slug}
                    onChange={(e) => updateSeo('slug', e.target.value)}
                    placeholder="URL Slug (e.g. wireless-headphones)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <textarea
                    rows={2}
                    value={formData.seo.description}
                    onChange={(e) => updateSeo('description', e.target.value)}
                    placeholder="Meta description"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    value={formData.seo.keywords.join(', ')}
                    onChange={(e) =>
                      updateSeo(
                        'keywords',
                        e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
                      )
                    }
                    placeholder="Keywords (comma separated)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
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
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
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
            <img
              src={
                previewProduct.images[previewImageIndex] ||
                previewProduct.images[0] ||
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'
              }
              alt={previewProduct.name}
              className="h-48 w-full rounded-2xl object-cover mb-4"
            />
            {previewProduct.images.length > 1 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {previewProduct.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewImageIndex(i)}
                    className={`shrink-0 cursor-pointer rounded-lg border-2 transition-colors ${
                      i === previewImageIndex ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <img src={img} alt={`Angle ${i + 1}`} className="h-12 w-12 rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            )}
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
