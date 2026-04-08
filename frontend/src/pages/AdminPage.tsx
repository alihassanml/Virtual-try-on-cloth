import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShoppingBag, Package, Trash2, Plus, Upload,
  LogOut, Loader2, X, DollarSign, Eye, RefreshCw, Users
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const adminApi = axios.create({ baseURL: BASE_URL });
adminApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

interface Product {
  id: number; name: string; description: string; price: number;
  category: string; image: string | null; created_at: string;
}
interface Order {
  id: number; user_name: string; email: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  total_price: number; status: string; payment_last4: string;
  shipping_name: string; shipping_address: string; created_at: string;
}

const AdminPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [isVerifying, setIsVerifying]   = useState(true);
  const [loginForm, setLoginForm]       = useState({ username: '', password: '' });
  const [loginError, setLoginError]     = useState('');
  const [isLoggingIn, setIsLoggingIn]   = useState(false);
  const [activeTab, setActiveTab]       = useState<'products' | 'orders'>('products');

  // Products
  const [products, setProducts]         = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct]     = useState({ name: '', description: '', price: '', category: 'T-Shirt' });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Orders
  const [orders, setOrders]             = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Verify existing admin token on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setIsVerifying(false); return; }
    adminApi.get('/admin/verify')
      .then(() => setIsLoggedIn(true))
      .catch(() => localStorage.removeItem('admin_token'))
      .finally(() => setIsVerifying(false));
  }, []);

  useEffect(() => { if (isLoggedIn) { fetchProducts(); fetchOrders(); } }, [isLoggedIn]);

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) return;
    setIsLoggingIn(true); setLoginError('');
    try {
      const res = await axios.post(`${BASE_URL}/admin/login`, loginForm);
      localStorage.setItem('admin_token', res.data.token);
      setIsLoggedIn(true);
    } catch {
      setLoginError('Invalid username or password.');
    } finally { setIsLoggingIn(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsLoggedIn(false);
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try { const r = await adminApi.get('/products'); setProducts(r.data.products); }
    catch { /* silent */ } finally { setIsLoadingProducts(false); }
  };

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try { const r = await adminApi.get('/admin/orders'); setOrders(r.data.orders); }
    catch { /* silent */ } finally { setIsLoadingOrders(false); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    setIsAddingProduct(true);
    try {
      const fd = new FormData();
      fd.append('name', newProduct.name);
      fd.append('description', newProduct.description);
      fd.append('price', newProduct.price);
      fd.append('category', newProduct.category);
      if (productImage) fd.append('image', productImage);
      await adminApi.post('/products', fd);
      setShowAddProduct(false);
      setNewProduct({ name: '', description: '', price: '', category: 'T-Shirt' });
      setProductImage(null); setProductImagePreview('');
      fetchProducts();
    } catch { alert('Failed to add product.'); }
    finally { setIsAddingProduct(false); }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Delete this product permanently?')) return;
    try { await adminApi.delete(`/products/${id}`); setProducts(p => p.filter(x => x.id !== id)); }
    catch { alert('Failed to delete.'); }
  };

  const totalRevenue = orders.reduce((s, o) => s + o.total_price, 0);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0b14' }}>
        <div className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0b0b14' }}>
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden">
          <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '600px', height: '600px', background: 'radial-gradient(ellipse,rgba(217,70,239,0.08) 0%,transparent 70%)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm p-8 rounded-3xl space-y-6"
          style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#d946ef,#f472b6)' }}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-xl">Admin Panel</p>
              <p className="text-white/30 text-xs mt-0.5">TryAndBuy · Restricted Access</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { placeholder: 'Username', key: 'username', type: 'text' },
              { placeholder: 'Password', key: 'password', type: 'password' },
            ].map(f => (
              <input key={f.key} type={f.type} placeholder={f.placeholder}
                value={(loginForm as any)[f.key]}
                onChange={e => setLoginForm(p => ({ ...p, [f.key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
            ))}
          </div>

          {loginError && (
            <p className="text-red-400/80 text-sm text-center">{loginError}</p>
          )}

          <button onClick={handleLogin} disabled={isLoggingIn}
            className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 28px rgba(217,70,239,0.35)' }}>
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In to Admin'}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Admin dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#0b0b14' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(14,14,28,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#d946ef,#f472b6)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-none">TryAndBuy</p>
            <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Products', value: products.length, icon: <ShoppingBag className="w-5 h-5" />, color: '#c084fc' },
            { label: 'Orders', value: orders.length, icon: <Package className="w-5 h-5" />, color: '#d946ef' },
            { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" />, color: '#34d399' },
          ].map(stat => (
            <div key={stat.label} className="p-5 rounded-2xl flex items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25`, color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <p className="text-white/35 text-xs font-bold uppercase tracking-wide">{stat.label}</p>
                <p className="text-white font-black text-xl">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2">
          {([
            { id: 'products', label: 'Products', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'orders',   label: 'All Orders', icon: <Package className="w-4 h-4" /> },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{
                background: activeTab === t.id ? 'rgba(217,70,239,0.12)' : 'rgba(255,255,255,0.04)',
                border: activeTab === t.id ? '1px solid rgba(217,70,239,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: activeTab === t.id ? '#d946ef' : 'rgba(255,255,255,0.4)',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Products ── */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-sm font-bold">{products.length} products</p>
              <div className="flex gap-2">
                <button onClick={fetchProducts}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowAddProduct(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 20px rgba(217,70,239,0.3)' }}>
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full animate-spin"
                  style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="aspect-[3/4] bg-white/5 relative overflow-hidden">
                      {p.image
                        ? <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={p.name} />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.1)' }} /></div>
                      }
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-bold"
                        style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)' }}>
                        {p.category}
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-white font-bold text-sm truncate">{p.name}</p>
                      <p className="font-black text-sm" style={{ color: '#d946ef' }}>${p.price.toFixed(2)}</p>
                      <button onClick={() => handleDeleteProduct(p.id)}
                        className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-105"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Orders ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-sm font-bold">{orders.length} total orders</p>
              <button onClick={fetchOrders}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {isLoadingOrders ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full animate-spin"
                  style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="h-48 flex items-center justify-center rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.07)' }}>
                <p className="text-white/20 font-bold">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, i) => (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }} className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between px-5 py-4"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                          <Package className="w-4 h-4" style={{ color: '#34d399' }} />
                        </div>
                        <div>
                          <p className="text-white font-black text-sm">Order #{order.id}</p>
                          <p className="text-white/30 text-xs">{order.user_name} · {order.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase"
                          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                          {order.status}
                        </span>
                        <span className="font-black text-white">${order.total_price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="px-5 py-3 flex flex-wrap gap-4 text-xs text-white/30">
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span>**** {order.payment_last4}</span>
                      <span>{order.shipping_name} · {order.shipping_address}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
              onClick={() => setShowAddProduct(false)} />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-2xl z-10 overflow-y-auto"
              style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}>
              <div className="p-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-black text-lg">Add Product</h3>
                  <button onClick={() => setShowAddProduct(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.4)' }}><X className="w-4 h-4" /></button>
                </div>

                <label htmlFor="admin-product-img"
                  className="block rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ aspectRatio: '3/4', background: productImagePreview ? 'transparent' : 'rgba(255,255,255,0.03)', border: productImagePreview ? 'none' : '1.5px dashed rgba(255,255,255,0.1)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setProductImage(f); setProductImagePreview(URL.createObjectURL(f)); } }}>
                  <input id="admin-product-img" type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setProductImage(f); setProductImagePreview(URL.createObjectURL(f)); } e.target.value = ''; }} />
                  {productImagePreview
                    ? <img src={productImagePreview} className="w-full h-full object-cover" alt="" />
                    : <div className="h-full flex flex-col items-center justify-center gap-3" style={{ minHeight: '160px' }}>
                        <Upload className="w-8 h-8" style={{ color: 'rgba(192,132,252,0.5)' }} />
                        <p className="text-white/25 text-sm font-bold">Upload image</p>
                      </div>
                  }
                </label>

                {[
                  { placeholder: 'Product name *', key: 'name', type: 'text' },
                  { placeholder: 'Price (USD) *', key: 'price', type: 'number' },
                ].map(f => (
                  <input key={f.key} type={f.type} placeholder={f.placeholder}
                    value={(newProduct as any)[f.key]}
                    onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                ))}

                <select value={newProduct.category}
                  onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                  {['T-Shirt', 'Shirt', 'Dress', 'Pants', 'Jacket', 'Hoodie', 'Skirt', 'Coat', 'Shoes', 'Accessories'].map(c => (
                    <option key={c} value={c} style={{ background: '#0e0e1c' }}>{c}</option>
                  ))}
                </select>

                <textarea placeholder="Description (optional)" value={newProduct.description}
                  onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                  rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />

                <div className="flex gap-3">
                  <button onClick={() => setShowAddProduct(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
                  <button onClick={handleAddProduct} disabled={isAddingProduct || !newProduct.name || !newProduct.price}
                    className="flex-[2] py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>
                    {isAddingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add Product</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
