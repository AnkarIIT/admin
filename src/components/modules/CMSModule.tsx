import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Menu as MenuIcon,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Globe,
  CheckCircle,
  FolderPlus,
  Upload,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { CMSPage, Banner, BlogPost } from '../../types';
import { fileToDataUrl } from '../../lib/imageUpload';

export const CMSModule: React.FC = () => {
  const {
    cmsPages,
    banners,
    blogPosts,
    addCMSPage,
    updateCMSPage,
    addBanner,
    addBlogPost,
    addToast,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'pages' | 'banners' | 'blog'>('pages');

  // Page Modal
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');

  // Banner Modal
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImage, setBannerImage] = useState('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80');
  const [bannerCtaText, setBannerCtaText] = useState('Shop Now');
  const [bannerCtaLink, setBannerCtaLink] = useState('/products');

  // Blog Modal
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogImage, setBlogImage] = useState('https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80');

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle.trim()) return;
    addCMSPage({
      title: pageTitle,
      slug: pageSlug || pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'Published',
      sections: [],
    });
    setPageTitle('');
    setPageContent('');
    setPageModalOpen(false);
  };

  const handleBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;
    addBanner({
      title: bannerTitle,
      imageUrl: bannerImage,
      ctaText: bannerCtaText,
      ctaLink: bannerCtaLink,
      position: 'Homepage Hero',
      active: true,
    });
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerModalOpen(false);
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBannerImage(await fileToDataUrl(file));
    } catch (err: any) {
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    }
    e.target.value = '';
  };

  const handleBlogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim()) return;
    addBlogPost({
      title: blogTitle,
      slug: blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: 'News',
      coverImage: blogImage,
      excerpt: '',
      content: blogContent,
      author: 'Store Editor',
      status: 'Published',
      createdAt: new Date().toISOString().substring(0, 10),
    });
    setBlogTitle('');
    setBlogContent('');
    setBlogModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-100">
        <div>
          <p className="text-sm font-extrabold">Not Connected to a live content backend</p>
          <p className="text-xs opacity-80">This tab is a demo. Pages, banners, and blog posts are not saved to the database and will reset on refresh.</p>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Store CMS & Content Builder
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage custom store pages, hero homepage banners, and news blog posts
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {[
            { id: 'pages', label: 'Store Pages', icon: FileText },
            { id: 'banners', label: 'Hero Sliders', icon: ImageIcon },
            { id: 'blog', label: 'News & Blog', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pages View */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setPageModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Create Custom Page
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {cmsPages.map((page) => (
              <div key={page.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    /{page.slug}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Published
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{page.title}</h3>
                <p className="text-slate-500 line-clamp-2 text-[11px]">
                  {page.sections.length > 0 ? `${page.sections.length} content section(s)` : 'No content sections yet'}
                </p>
                <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Last Updated: {page.updatedAt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banners View */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setBannerModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Add Hero Banner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {banners.map((ban) => (
              <div key={ban.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 group">
                <img src={ban.imageUrl} alt={ban.title} className="h-48 w-full object-cover" />
                <div className="p-4 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent absolute inset-0 flex flex-col justify-end text-white">
                  <h3 className="text-base font-black">{ban.title}</h3>
                  <p className="text-xs opacity-90">{ban.position}</p>
                  <span className="mt-2 inline-block self-start rounded-xl bg-indigo-600 px-3 py-1 font-bold text-[11px]">
                    {ban.ctaText} → {ban.ctaLink}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog View */}
      {activeTab === 'blog' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setBlogModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Write Blog Post
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {blogPosts.map((post) => (
              <div key={post.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <img src={post.coverImage} alt={post.title} className="h-36 w-full rounded-2xl object-cover" />
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{post.createdAt} • By {post.author}</p>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{post.title}</h3>
                <p className="text-slate-500 line-clamp-3">{post.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Page Modal */}
      {pageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Create Custom Page</h3>
            <form onSubmit={handlePageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Page Title</label>
                <input
                  type="text"
                  required
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Shipping & Return Policy"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Page Content</label>
                </div>
                <textarea
                  rows={4}
                  value={pageContent}
                  onChange={(e) => setPageContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPageModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Publish Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Banner Modal */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Add Homepage Hero Banner</h3>
            <form onSubmit={handleBannerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Banner Headline</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="Summer Sonic Sale 2026"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Subtitle</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="Up to 40% off premium audio devices"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Banner Image</label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400">
                  {bannerImage ? (
                    <img src={bannerImage} alt="Banner preview" className="h-32 w-full rounded-xl object-cover" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Click to upload a banner image</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} />
                </label>
                {bannerImage && (
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    className="mt-2 text-xs font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Remove image
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Add Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Blog Modal */}
      {blogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Write News Article</h3>
            <form onSubmit={handleBlogSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Article Title</label>
                <input
                  type="text"
                  required
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                  placeholder="5 Tips for Choosing Noise Cancelling Headphones"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Content</label>
                <textarea
                  rows={4}
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlogModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
