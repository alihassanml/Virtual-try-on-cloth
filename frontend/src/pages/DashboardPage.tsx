import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, LogOut, LayoutDashboard, History as HistoryIcon,
  Upload, Camera, Trash2, Download, RotateCcw, ZoomIn, ZoomOut,
  X, Loader2, Activity, Link as LinkIcon, ChevronRight,
  Maximize2, User as UserIcon, Plus, CheckCircle2,
  ShoppingBag, Package, Wand2, ShoppingCart, CreditCard, Tag, DollarSign, MapPin
} from 'lucide-react';

interface Product {
  id: number; name: string; description: string; price: number;
  category: string; image: string | null; created_by: number; created_at: string;
}
interface CartItem {
  id: number; product_id: number; name: string; price: number;
  category: string; quantity: number; image: string | null;
}
interface Order {
  id: number;
  items: Array<{ product_id: number; name: string; price: number; quantity: number }>;
  total_price: number; status: string; payment_last4: string;
  shipping_name: string; shipping_address: string; created_at: string;
}

// ── Saved Photo type ──────────────────────────────────────────────────────────
interface SavedPhoto {
  id: string;
  dataUrl: string;
  name: string;
  category: 'model' | 'garment';
  addedAt: string;
}

const PHOTOS_KEY = 'tryandbuy_model_photos';

// ── 3D Image Viewer ──────────────────────────────────────────────────────────
const Viewer3D: React.FC<{ src: string; onClose: () => void; onDownload: () => void }> = ({ src, onClose, onDownload }) => {
  const [rot, setRot]       = useState({ x: -8, y: 12 });
  const [zoom, setZoom]     = useState(1);
  const [dragging, setDragging] = useState(false);
  const last = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    setRot(prev => ({
      x: Math.max(-45, Math.min(45, prev.x - dy * 0.35)),
      y: prev.y + dx * 0.35,
    }));
    last.current = { x: e.clientX, y: e.clientY };
  }, [dragging]);
  const onMouseUp = () => setDragging(false);
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.4, Math.min(3, prev - e.deltaY * 0.001)));
  };
  const reset = () => { setRot({ x: -8, y: 12 }); setZoom(1); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-10">
        <div>
          <p className="text-white font-black text-sm">3D Viewer</p>
          <p className="text-white/30 text-xs mt-0.5">Drag to rotate · Scroll to zoom</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(p => Math.min(3, p + 0.2))}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(p => Math.max(0.4, p - 0.2))}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={reset}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-xs transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 20px rgba(217,70,239,0.4)' }}>
            <Download className="w-4 h-4" />
            Download
          </button>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:bg-red-500/20"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Image */}
      <div
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        className="select-none"
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          transform: `perspective(900px) rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale(${zoom})`,
          transition: dragging ? 'none' : 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
          transformStyle: 'preserve-3d',
        }}
      >
        <img
          src={src}
          alt="3D Result"
          draggable={false}
          style={{
            maxHeight: '75vh',
            maxWidth: '70vw',
            borderRadius: '20px',
            boxShadow: '0 60px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(217,70,239,0.2)',
            display: 'block',
          }}
        />
        {/* Reflection plane */}
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '5%',
          width: '90%',
          height: '60px',
          background: 'linear-gradient(to bottom, rgba(217,70,239,0.15), transparent)',
          filter: 'blur(20px)',
          borderRadius: '50%',
          transform: 'rotateX(80deg) translateZ(-30px)',
        }} />
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
        {Math.round(zoom * 100)}% · Rotation {Math.round(rot.y % 360)}°
      </div>
    </motion.div>
  );
};

// ── Upload Zone ───────────────────────────────────────────────────────────────
interface UploadZoneProps {
  label: string;
  step: string;
  preview: string;
  onFile: (f: File) => void;
  onClear: () => void;
  onCamera?: () => void;
  onUrl?: () => void;
  quickItems?: string[];
  onQuickSelect?: (url: string) => void;
  accentColor: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  label, step, preview, onFile, onClear, onCamera, onUrl, quickItems, onQuickSelect, accentColor
}) => {
  const inputId = `upload-${step}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ color: accentColor }}>{step}</span>
          <span className="text-xs font-bold text-white/50">{label}</span>
        </div>
        {preview && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />}
      </div>

      <label
        htmlFor={inputId}
        className="relative block rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group"
        style={{
          aspectRatio: '3/4',
          background: preview ? 'transparent' : 'rgba(255,255,255,0.03)',
          border: preview ? 'none' : `1.5px dashed rgba(255,255,255,0.1)`,
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f && f.type.startsWith('image/')) onFile(f);
        }}
      >
        <input id={inputId} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

        {preview ? (
          <div className="relative w-full h-full">
            <img src={preview} className="w-full h-full object-cover" alt={label} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.5)' }} />
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onClear(); }}
              className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
              style={{ background: 'rgba(239,68,68,0.8)', backdropFilter: 'blur(8px)' }}>
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
              <div className="flex gap-2">
                <label htmlFor={inputId}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                  <Upload className="w-3.5 h-3.5" />
                  Change
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 gap-4"
            style={{ minHeight: '280px' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
              <Upload className="w-6 h-6" style={{ color: accentColor }} />
            </div>
            <div className="text-center">
              <p className="text-white/60 font-bold text-sm">Drop image here</p>
              <p className="text-white/25 text-xs mt-1">or click to browse</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {onCamera && (
                <button type="button"
                  onClick={e => { e.preventDefault(); onCamera(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                  <Camera className="w-3.5 h-3.5" />
                  Camera
                </button>
              )}
              {onUrl && (
                <button type="button"
                  onClick={e => { e.preventDefault(); onUrl(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                  <LinkIcon className="w-3.5 h-3.5" />
                  URL
                </button>
              )}
            </div>
          </div>
        )}
      </label>

      {/* Quick select thumbnails */}
      {quickItems && quickItems.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.25)' }}>Recent</p>
          <div className="grid grid-cols-4 gap-2">
            {quickItems.slice(0, 4).map((url, i) => (
              <button key={i}
                onClick={() => onQuickSelect?.(url)}
                className="aspect-[3/4] rounded-xl overflow-hidden transition-all hover:scale-105 hover:ring-2"
                style={{ border: '1px solid rgba(255,255,255,0.08)', ringColor: accentColor }}>
                <img src={url} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'photos' | 'store' | 'occasion' | 'orders'>('studio');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Store
  const [products, setProducts]               = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct]   = useState(false);
  const [newProductForm, setNewProductForm]   = useState({ name: '', description: '', price: '', category: 'T-Shirt' });
  const [productImageFile, setProductImageFile]   = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Cart
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [showCart, setShowCart]   = useState(false);
  const [cartAdding, setCartAdding] = useState<number | null>(null);

  // Orders
  const [orders, setOrders]                   = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);

  // Payment
  const [showPayment, setShowPayment]         = useState(false);
  const [paymentForm, setPaymentForm]         = useState({ number: '', expiry: '', cvv: '', name: '', address: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderSuccess, setOrderSuccess]       = useState(false);

  // Saved photos (localStorage) — migrate old entries that lack category
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>(() => {
    try {
      const raw: any[] = JSON.parse(localStorage.getItem(PHOTOS_KEY) || '[]');
      return raw.map(p => ({ ...p, category: p.category ?? 'model' }));
    } catch { return []; }
  });

  // Add photo modal
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [modalCategory, setModalCategory]         = useState<'model' | 'garment'>('model');
  const [modalFile, setModalFile]                 = useState<File | null>(null);
  const [modalPreview, setModalPreview]           = useState('');

  // Occasion planner
  const [occasionInput, setOccasionInput]       = useState('');
  const [occasionResult, setOccasionResult]     = useState<any>(null);
  const [isOccasionLoading, setIsOccasionLoading] = useState(false);
  const [showOccasion, setShowOccasion]         = useState(false);
  const [occasionImageUrl, setOccasionImageUrl] = useState('');

  // Try-on state
  const [personFile, setPersonFile]       = useState<File | null>(null);
  const [clothFile, setClothFile]         = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState('');
  const [clothPreview, setClothPreview]   = useState('');
  const [resultImage, setResultImage]     = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [loadingText, setLoadingText]     = useState('Initializing...');
  const [error, setError]                 = useState('');

  // 3D viewer
  const [showViewer, setShowViewer] = useState(false);
  const [viewerSrc, setViewerSrc]   = useState('');

  // Camera
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // URL modal
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput]         = useState('');
  const [urlTarget, setUrlTarget]       = useState<'person' | 'cloth'>('person');
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  // History
  const [history, setHistory]               = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadingMessages = [
    'Initializing AI Engine...',
    'Detecting body pose...',
    'Mapping garment fabric...',
    'Warping cloth to figure...',
    'Refining details...',
    'Almost ready...',
  ];

  useEffect(() => {
    if (!isLoading) return;
    let idx = 0;
    const t = setInterval(() => {
      idx = (idx + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[idx]);
    }, 2200);
    return () => clearInterval(t);
  }, [isLoading]);

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab]);

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await api.get('/history');
      setHistory(res.data.history);
    } catch { /* silent */ }
    finally { setIsHistoryLoading(false); }
  };

  // Persist photos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(savedPhotos));
  }, [savedPhotos]);

  const addSavedPhoto = (file: File, category: 'model' | 'garment') => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const photo: SavedPhoto = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dataUrl,
        name: file.name,
        category,
        addedAt: new Date().toISOString(),
      };
      setSavedPhotos(prev => [photo, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const deleteSavedPhoto = (id: string) => {
    setSavedPhotos(prev => prev.filter(p => p.id !== id));
  };

  const usePhotoInStudio = (dataUrl: string, category: 'model' | 'garment') => {
    if (category === 'model') {
      const f = dataURLtoFile(dataUrl, 'model-photo.jpg');
      if (f) { setPersonFile(f); setPersonPreview(dataUrl); setResultImage(''); }
    } else {
      const f = dataURLtoFile(dataUrl, 'garment.jpg');
      if (f) { setClothFile(f); setClothPreview(dataUrl); setResultImage(''); }
    }
    setActiveTab('studio');
  };

  // Add photo modal handlers
  const handleModalFile = (file: File) => {
    setModalFile(file);
    setModalPreview(URL.createObjectURL(file));
  };

  const handleSaveModalPhoto = () => {
    if (!modalFile) return;
    addSavedPhoto(modalFile, modalCategory);
    setModalFile(null);
    setModalPreview('');
    setShowAddPhotoModal(false);
  };

  const closeAddPhotoModal = () => {
    setModalFile(null);
    setModalPreview('');
    setShowAddPhotoModal(false);
  };

  // Occasion planner
  const handleOccasionSuggest = async () => {
    if (!occasionInput.trim()) return;
    setIsOccasionLoading(true);
    setOccasionResult(null);
    setOccasionImageUrl('');
    try {
      const res = await api.post('/occasion-suggest', { occasion: occasionInput });
      const data = res.data;
      setOccasionResult(data);
      // Build image URL once (not in render to avoid re-generation)
      if (data.outfit_suggestions?.[0]) {
        const s = data.outfit_suggestions[0];
        const prompt = encodeURIComponent(
          `fashion model wearing ${s.items?.join(', ')}, ${data.occasion_type} style, ${data.recommended_colors?.[0] || 'neutral'} color palette, professional fashion photography, full body shot, clean white studio background`
        );
        setOccasionImageUrl(`https://image.pollinations.ai/prompt/${prompt}?width=480&height=640&nologo=true&enhance=true`);
      }
    } catch {
      setOccasionResult({ error: 'Failed to get suggestions. Try again.' });
    } finally {
      setIsOccasionLoading(false);
    }
  };

  // Store handlers
  const fetchProducts = async () => {
    setIsProductsLoading(true);
    try { const res = await api.get('/products'); setProducts(res.data.products); }
    catch { /* silent */ } finally { setIsProductsLoading(false); }
  };

  const fetchCart = async () => {
    try { const res = await api.get('/cart'); setCart(res.data.cart); }
    catch { /* silent */ }
  };

  const fetchOrders = async () => {
    setIsOrdersLoading(true);
    try { const res = await api.get('/orders'); setOrders(res.data.orders); }
    catch { /* silent */ } finally { setIsOrdersLoading(false); }
  };

  const handleAddProduct = async () => {
    if (!newProductForm.name || !newProductForm.price) return;
    setIsAddingProduct(true);
    try {
      const fd = new FormData();
      fd.append('name', newProductForm.name);
      fd.append('description', newProductForm.description);
      fd.append('price', newProductForm.price);
      fd.append('category', newProductForm.category);
      if (productImageFile) fd.append('image', productImageFile);
      await api.post('/products', fd);
      setShowAddProduct(false);
      setNewProductForm({ name: '', description: '', price: '', category: 'T-Shirt' });
      setProductImageFile(null); setProductImagePreview('');
      fetchProducts();
    } catch { alert('Failed to add product.'); }
    finally { setIsAddingProduct(false); }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); setProducts(p => p.filter(x => x.id !== id)); }
    catch { alert('Failed to delete.'); }
  };

  const handleAddToCart = async (productId: number) => {
    setCartAdding(productId);
    try { await api.post('/cart', { product_id: productId, quantity: 1 }); await fetchCart(); }
    catch { alert('Failed to add to cart.'); }
    finally { setCartAdding(null); }
  };

  const handleRemoveFromCart = async (cartId: number) => {
    try { await api.delete(`/cart/${cartId}`); setCart(c => c.filter(x => x.id !== cartId)); }
    catch { /* silent */ }
  };

  const handlePlaceOrder = async () => {
    const { number, expiry, cvv, name, address } = paymentForm;
    if (!number || !expiry || !cvv || !name || !address) { alert('Fill all payment fields.'); return; }
    setIsProcessingPayment(true);
    try {
      await api.post('/orders', {
        payment_last4: number.replace(/\s/g, '').slice(-4),
        shipping_name: name,
        shipping_address: address,
      });
      setCart([]);
      setOrderSuccess(true);
      setPaymentForm({ number: '', expiry: '', cvv: '', name: '', address: '' });
      fetchOrders();
      setTimeout(() => { setOrderSuccess(false); setShowPayment(false); setShowCart(false); }, 2500);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Payment failed.');
    } finally { setIsProcessingPayment(false); }
  };

  const tryProductInStudio = (product: Product) => {
    if (product.image) {
      const f = dataURLtoFile(product.image, `${product.name}.jpg`);
      if (f) { setClothFile(f); setClothPreview(product.image); setResultImage(''); }
    }
    setSelectedProduct(null);
    setActiveTab('studio');
  };

  // Load on tab switch
  useEffect(() => { if (activeTab === 'store') fetchProducts(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab]);
  useEffect(() => { fetchCart(); }, []);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleLogout = () => { logout(); navigate('/'); };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    if (!mime) return null;
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new File([u8], filename, { type: mime });
  };

  const setPersonFromUrl = (imageUrl: string) => {
    const f = dataURLtoFile(imageUrl, 'person.jpg');
    if (f) { setPersonFile(f); setPersonPreview(imageUrl); setResultImage(''); }
  };
  const setClothFromUrl = (imageUrl: string) => {
    const f = dataURLtoFile(imageUrl, 'cloth.jpg');
    if (f) { setClothFile(f); setClothPreview(imageUrl); setResultImage(''); }
  };

  // Camera
  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Camera access denied or unavailable.');
      setShowCamera(false);
    }
  };
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPersonFromUrl(dataUrl);
    stopCamera();
  };

  // URL upload
  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;
    setIsUrlLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/proxy-image?url=${encodeURIComponent(urlInput)}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const file = new File([blob], 'online-image.jpg', { type: 'image/jpeg' });
      if (urlTarget === 'person') { setPersonFile(file); setPersonPreview(objectUrl); }
      else { setClothFile(file); setClothPreview(objectUrl); }
      setShowUrlModal(false);
      setUrlInput('');
    } catch {
      alert('Failed to fetch image. Check the URL.');
    } finally {
      setIsUrlLoading(false);
    }
  };

  // Try-on
  const handleTryOn = async () => {
    if (!personFile || !clothFile) {
      setError('Please upload both a model photo and a garment image.');
      return;
    }
    setError('');
    setIsLoading(true);
    setResultImage('');
    const fd = new FormData();
    fd.append('person_image', personFile);
    fd.append('cloth_image', clothFile);
    try {
      const res = await api.post('/try-on', fd, { responseType: 'blob' });
      setResultImage(URL.createObjectURL(res.data));
      if (activeTab === 'history') fetchHistory();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await api.delete(`/history/${id}`);
      setHistory(h => h.filter(i => i.id !== id));
    } catch { alert('Failed to delete.'); }
  };

  const openViewer = (src: string) => { setViewerSrc(src); setShowViewer(true); };
  const downloadImage = (src: string, name = 'tryon-result.png') => {
    const a = document.createElement('a'); a.href = src; a.download = name; a.click();
  };

  const personHistory  = [...new Set(history.map(i => i.person_image).filter(Boolean))] as string[];
  const clothHistory   = [...new Set(history.map(i => i.cloth_image).filter(Boolean))]  as string[];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0b0b14' }}>

      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col z-40"
        style={{ background: '#0e0e1c', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="px-6 py-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#d946ef,#f472b6)' }}>
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-base leading-none">
                Try<span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg,#d946ef,#f472b6)' }}>And</span>Buy
              </p>
              <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Virtual Studio
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest px-3 mb-3"
            style={{ color: 'rgba(255,255,255,0.2)' }}>Menu</p>

          {([
            { id: 'studio',   icon: <LayoutDashboard className="w-4 h-4" />, label: 'Studio'     },
            { id: 'store',    icon: <ShoppingBag     className="w-4 h-4" />, label: 'Store'      },
            { id: 'occasion', icon: <Wand2           className="w-4 h-4" />, label: 'Occasion AI'},
            { id: 'history',  icon: <HistoryIcon     className="w-4 h-4" />, label: 'History'    },
            { id: 'photos',   icon: <UserIcon        className="w-4 h-4" />, label: 'My Photos'  },
            { id: 'orders',   icon: <Package         className="w-4 h-4" />, label: 'My Orders'  },
          ] as const).map(item => (
            <button key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                background: activeTab === item.id ? 'rgba(217,70,239,0.12)' : 'transparent',
                border: activeTab === item.id ? '1px solid rgba(217,70,239,0.25)' : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: activeTab === item.id ? '#d946ef' : 'rgba(255,255,255,0.35)' }}>
                  {item.icon}
                </span>
                <span className="font-bold text-sm"
                  style={{ color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.4)' }}>
                  {item.label}
                </span>
              </div>
              {activeTab === item.id && (
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#d946ef' }} />
              )}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t space-y-2"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Cart button */}
          <button onClick={() => { setActiveTab('store'); setShowCart(true); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4" />
              My Cart
            </div>
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#d946ef,#f472b6)', color: 'white' }}>
                {cart.length}
              </span>
            )}
          </button>

          {/* User compact button */}
          <div className="relative">
            <button onClick={() => setShowUserMenu(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
              style={{
                background: showUserMenu ? 'rgba(217,70,239,0.08)' : 'rgba(255,255,255,0.04)',
                border: showUserMenu ? '1px solid rgba(217,70,239,0.2)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef)' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p className="text-white font-bold text-sm truncate">{user?.name}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                style={{ color: 'rgba(255,255,255,0.3)', transform: showUserMenu ? 'rotate(90deg)' : 'rotate(0deg)' }} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden"
                  style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  <button onClick={() => { handleLogout(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 font-bold text-sm transition-all hover:bg-red-500/10"
                    style={{ color: 'rgba(239,68,68,0.8)' }}>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse,rgba(217,70,239,0.06) 0%,transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse,rgba(139,92,246,0.05) 0%,transparent 70%)' }} />

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center"
              style={{ background: 'rgba(11,11,20,0.85)', backdropFilter: 'blur(16px)' }}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="flex flex-col items-center gap-8 p-12 rounded-3xl max-w-sm w-full mx-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full animate-spin"
                    style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
                  <div className="absolute inset-3 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(217,70,239,0.1)' }}>
                    <Sparkles className="w-5 h-5" style={{ color: '#d946ef' }} />
                  </div>
                </div>
                <div className="text-center">
                  <AnimatePresence mode="wait">
                    <motion.p key={loadingText}
                      initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
                      className="text-white font-black text-lg">
                      {loadingText}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-white/30 text-xs mt-2 font-medium">Neural rendering in progress</p>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg,#c084fc,#d946ef,#f472b6)' }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera modal */}
        <AnimatePresence>
          {showCamera && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
                onClick={stopCamera} />
              <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                className="relative w-full max-w-md rounded-3xl overflow-hidden z-10"
                style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="aspect-[3/4] bg-black relative">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-[12px] border-white/5 pointer-events-none rounded-3xl" />
                </div>
                <div className="p-6 flex gap-3">
                  <button onClick={stopCamera}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    Cancel
                  </button>
                  <button onClick={capturePhoto}
                    className="flex-[2] py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 24px rgba(217,70,239,0.4)' }}>
                    <Camera className="w-4 h-4" />
                    Capture
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* URL modal */}
        <AnimatePresence>
          {showUrlModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
                onClick={() => setShowUrlModal(false)} />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-md rounded-2xl p-8 z-10"
                style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="text-white font-black text-lg mb-1">Load from URL</h3>
                <p className="text-white/40 text-sm mb-6">
                  Paste a public image URL for the {urlTarget === 'person' ? 'model photo' : 'garment'}.
                </p>
                <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowUrlModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    Cancel
                  </button>
                  <button onClick={handleUrlUpload} disabled={isUrlLoading}
                    className="flex-[2] py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>
                    {isUrlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Image'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 3D Viewer */}
        <AnimatePresence>
          {showViewer && (
            <Viewer3D src={viewerSrc}
              onClose={() => setShowViewer(false)}
              onDownload={() => downloadImage(viewerSrc)} />
          )}
        </AnimatePresence>

        {/* ── Product Detail Modal ── */}
        <AnimatePresence>
          {selectedProduct && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
                onClick={() => setSelectedProduct(null)} />
              <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                className="relative w-full max-w-3xl rounded-3xl overflow-hidden z-10 flex flex-col md:flex-row"
                style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}>
                {/* Image */}
                <div className="w-full md:w-72 flex-shrink-0 bg-white/5 relative">
                  {selectedProduct.image
                    ? <img src={selectedProduct.image} className="w-full h-full object-cover" style={{ minHeight: '300px' }} alt={selectedProduct.name} />
                    : <div className="w-full h-64 flex items-center justify-center"><ShoppingBag className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.1)' }} /></div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 flex flex-col p-7 overflow-y-auto">
                  <button onClick={() => setSelectedProduct(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.4)' }}><X className="w-4 h-4" /></button>

                  <span className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#d946ef' }}>
                    {selectedProduct.category}
                  </span>
                  <h2 className="text-2xl font-black text-white">{selectedProduct.name}</h2>
                  <p className="text-3xl font-black mt-2 mb-4" style={{ color: '#c084fc' }}>${selectedProduct.price.toFixed(2)}</p>

                  {selectedProduct.description && (
                    <p className="text-white/45 text-sm leading-relaxed mb-6">{selectedProduct.description}</p>
                  )}

                  <div className="mt-auto space-y-3">
                    <button onClick={() => tryProductInStudio(selectedProduct)}
                      className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef)', boxShadow: '0 0 24px rgba(217,70,239,0.35)' }}>
                      <Sparkles className="w-4 h-4" /> Try This On
                    </button>
                    <button onClick={async () => { await handleAddToCart(selectedProduct.id); setSelectedProduct(null); setShowCart(true); }}
                      className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                    <button onClick={async () => { await handleAddToCart(selectedProduct.id); setSelectedProduct(null); setShowCart(true); setShowPayment(true); }}
                      className="w-full py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02] text-sm"
                      style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                      <CreditCard className="w-4 h-4" /> Book Now
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Add Product Modal ── */}
        <AnimatePresence>
          {showAddProduct && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
                onClick={() => setShowAddProduct(false)} />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-md rounded-2xl z-10 overflow-y-auto"
                style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}>
                <div className="p-7 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-black text-lg">Add Product</h3>
                    <button onClick={() => setShowAddProduct(false)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.4)' }}><X className="w-4 h-4" /></button>
                  </div>

                  {/* Product image upload */}
                  <label htmlFor="product-img-input"
                    className="block rounded-2xl overflow-hidden cursor-pointer group"
                    style={{ aspectRatio: '3/4', background: productImagePreview ? 'transparent' : 'rgba(255,255,255,0.03)', border: productImagePreview ? 'none' : '1.5px dashed rgba(255,255,255,0.1)' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) { setProductImageFile(f); setProductImagePreview(URL.createObjectURL(f)); } }}>
                    <input id="product-img-input" type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setProductImageFile(f); setProductImagePreview(URL.createObjectURL(f)); } e.target.value = ''; }} />
                    {productImagePreview
                      ? <img src={productImagePreview} className="w-full h-full object-cover" alt="" />
                      : <div className="h-full flex flex-col items-center justify-center gap-3" style={{ minHeight: '180px' }}>
                          <Upload className="w-8 h-8" style={{ color: 'rgba(192,132,252,0.5)' }} />
                          <p className="text-white/30 text-sm font-bold">Upload product image</p>
                        </div>
                    }
                  </label>

                  {/* Fields */}
                  {[
                    { placeholder: 'Product name *', key: 'name', type: 'text' },
                    { placeholder: 'Price (USD) *', key: 'price', type: 'number' },
                  ].map(f => (
                    <input key={f.key} type={f.type} placeholder={f.placeholder}
                      value={(newProductForm as any)[f.key]}
                      onChange={e => setNewProductForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                  ))}

                  <select value={newProductForm.category}
                    onChange={e => setNewProductForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                    {['T-Shirt', 'Shirt', 'Dress', 'Pants', 'Jacket', 'Hoodie', 'Skirt', 'Coat', 'Shoes', 'Accessories'].map(c => (
                      <option key={c} value={c} style={{ background: '#0e0e1c' }}>{c}</option>
                    ))}
                  </select>

                  <textarea placeholder="Description (optional)" value={newProductForm.description}
                    onChange={e => setNewProductForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />

                  <div className="flex gap-3">
                    <button onClick={() => setShowAddProduct(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-sm"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
                    <button onClick={handleAddProduct} disabled={isAddingProduct || !newProductForm.name || !newProductForm.price}
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

        {/* ── Payment Modal ── */}
        <AnimatePresence>
          {showPayment && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
                onClick={() => !isProcessingPayment && setShowPayment(false)} />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-md rounded-2xl p-7 z-10 space-y-5"
                style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)' }}>

                {orderSuccess ? (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="py-8 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.4)' }}>
                      <CheckCircle2 className="w-8 h-8" style={{ color: '#34d399' }} />
                    </div>
                    <p className="text-white font-black text-xl">Order Placed!</p>
                    <p className="text-white/40 text-sm text-center">Your order has been confirmed. Check My Orders for details.</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-black text-lg">Payment</h3>
                        <p className="text-white/35 text-xs mt-0.5">Total: <span style={{ color: '#d946ef' }}>${cartTotal.toFixed(2)}</span></p>
                      </div>
                      <button onClick={() => setShowPayment(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.4)' }}><X className="w-4 h-4" /></button>
                    </div>

                    {/* Card preview */}
                    <div className="p-5 rounded-2xl"
                      style={{ background: 'linear-gradient(135deg,rgba(192,132,252,0.15),rgba(217,70,239,0.1))', border: '1px solid rgba(217,70,239,0.2)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <CreditCard className="w-6 h-6" style={{ color: '#d946ef' }} />
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Virtual Card</p>
                      </div>
                      <p className="text-white font-black text-xl tracking-[0.2em]">
                        {paymentForm.number ? paymentForm.number.replace(/(\d{4})/g, '$1 ').trim() : '**** **** **** ****'}
                      </p>
                      <div className="flex justify-between mt-3">
                        <p className="text-white/40 text-xs">{paymentForm.name || 'CARDHOLDER NAME'}</p>
                        <p className="text-white/40 text-xs">{paymentForm.expiry || 'MM/YY'}</p>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-3">
                      <input type="text" placeholder="Card number" maxLength={19}
                        value={paymentForm.number}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setPaymentForm(p => ({ ...p, number: v.replace(/(\d{4})/g, '$1 ').trim() }));
                        }}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="MM/YY" maxLength={5}
                          value={paymentForm.expiry}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                            setPaymentForm(p => ({ ...p, expiry: v }));
                          }}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                        <input type="text" placeholder="CVV" maxLength={3}
                          value={paymentForm.cvv}
                          onChange={e => setPaymentForm(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                      </div>
                      <input type="text" placeholder="Name on card"
                        value={paymentForm.name}
                        onChange={e => setPaymentForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                      <input type="text" placeholder="Shipping address"
                        value={paymentForm.address}
                        onChange={e => setPaymentForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                    </div>

                    <button onClick={handlePlaceOrder} disabled={isProcessingPayment}
                      className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 32px rgba(217,70,239,0.4)' }}>
                      {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> Pay ${cartTotal.toFixed(2)}</>}
                    </button>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Add Photo Modal ── */}
        <AnimatePresence>
          {showAddPhotoModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
                onClick={closeAddPhotoModal} />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-md rounded-2xl p-8 z-10 space-y-6"
                style={{ background: '#0e0e1c', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-black text-lg">Add Photo</h3>
                    <p className="text-white/35 text-xs mt-0.5">Upload and choose a category</p>
                  </div>
                  <button onClick={closeAddPhotoModal}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Category toggle */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Category</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['model', 'garment'] as const).map(cat => (
                      <button key={cat}
                        onClick={() => setModalCategory(cat)}
                        className="py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: modalCategory === cat
                            ? cat === 'model' ? 'rgba(192,132,252,0.15)' : 'rgba(244,114,182,0.15)'
                            : 'rgba(255,255,255,0.04)',
                          border: modalCategory === cat
                            ? cat === 'model' ? '1px solid rgba(192,132,252,0.4)' : '1px solid rgba(244,114,182,0.4)'
                            : '1px solid rgba(255,255,255,0.08)',
                          color: modalCategory === cat
                            ? cat === 'model' ? '#c084fc' : '#f472b6'
                            : 'rgba(255,255,255,0.35)',
                        }}>
                        {cat === 'model' ? 'Model Photo' : 'Garment'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload area */}
                <label htmlFor="modal-photo-input"
                  className="block rounded-2xl overflow-hidden cursor-pointer transition-all group"
                  style={{
                    aspectRatio: '3/4',
                    background: modalPreview ? 'transparent' : 'rgba(255,255,255,0.03)',
                    border: modalPreview ? 'none' : '1.5px dashed rgba(255,255,255,0.1)',
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleModalFile(f); }}>
                  <input id="modal-photo-input" type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleModalFile(f); e.target.value = ''; }} />
                  {modalPreview ? (
                    <div className="relative w-full h-full">
                      <img src={modalPreview} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <p className="text-white text-xs font-bold">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6" style={{ minHeight: '200px' }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
                        style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)' }}>
                        <Upload className="w-5 h-5" style={{ color: '#c084fc' }} />
                      </div>
                      <p className="text-white/50 font-bold text-sm text-center">Drop image here<br /><span className="text-white/25 text-xs font-normal">or click to browse</span></p>
                    </div>
                  )}
                </label>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={closeAddPhotoModal}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveModalPhoto} disabled={!modalFile}
                    className="flex-[2] py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-30 disabled:pointer-events-none"
                    style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>
                    <Plus className="w-4 h-4" />
                    Save Photo
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Tab content ── */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">

            {/* ── STUDIO TAB ── */}
            {activeTab === 'studio' && (
              <motion.div key="studio"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} className="space-y-8">

                {/* Header */}
                <div className="flex items-end justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      Virtual{' '}
                      <span className="text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>
                        Fitting Room
                      </span>
                    </h1>
                    <p className="text-white/35 text-sm mt-1.5 font-medium">
                      Upload a model photo and garment — our AI does the rest.
                    </p>
                  </div>
                  {(personPreview || clothPreview) && (
                    <button onClick={() => { setPersonFile(null); setPersonPreview(''); setClothFile(null); setClothPreview(''); setResultImage(''); setError(''); }}
                      className="text-xs font-bold transition-colors"
                      style={{ color: 'rgba(255,255,255,0.2)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                      Clear all
                    </button>
                  )}
                </div>

                {/* Upload grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UploadZone
                    label="Model Photo" step="01"
                    preview={personPreview}
                    accentColor="#c084fc"
                    onFile={f => { setPersonFile(f); setPersonPreview(URL.createObjectURL(f)); setResultImage(''); }}
                    onClear={() => { setPersonFile(null); setPersonPreview(''); }}
                    onCamera={startCamera}
                    onUrl={() => { setUrlTarget('person'); setShowUrlModal(true); }}
                    quickItems={personHistory}
                    onQuickSelect={setPersonFromUrl}
                  />
                  <UploadZone
                    label="Garment / Cloth" step="02"
                    preview={clothPreview}
                    accentColor="#f472b6"
                    onFile={f => { setClothFile(f); setClothPreview(URL.createObjectURL(f)); setResultImage(''); }}
                    onClear={() => { setClothFile(null); setClothPreview(''); }}
                    onUrl={() => { setUrlTarget('cloth'); setShowUrlModal(true); }}
                    quickItems={clothHistory}
                    onQuickSelect={setClothFromUrl}
                  />
                </div>

                {/* Error */}
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                {/* Generate button */}
                <button onClick={handleTryOn}
                  disabled={isLoading || !personFile || !clothFile}
                  className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg,#c084fc 0%,#d946ef 50%,#f472b6 100%)',
                    boxShadow: (!personFile || !clothFile) ? 'none' : '0 0 40px rgba(217,70,239,0.4), 0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                  {isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><Activity className="w-5 h-5" />Generate Try-On</>
                  }
                </button>

                {/* Result */}
                <AnimatePresence>
                  {resultImage && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between px-6 py-4"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-white font-black text-sm">Result Ready</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openViewer(resultImage)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all hover:scale-105"
                            style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.3)', color: '#d946ef' }}>
                            <Maximize2 className="w-3.5 h-3.5" />
                            View in 3D
                          </button>
                          <button onClick={() => downloadImage(resultImage)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all hover:scale-105"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-0">
                        {/* Image */}
                        <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
                          <img src={resultImage} alt="Try-on result"
                            className="max-h-[520px] max-w-full rounded-xl object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
                            onClick={() => openViewer(resultImage)} />
                        </div>
                        {/* Stats panel */}
                        <div className="w-full md:w-56 flex-shrink-0 p-6 flex flex-col gap-4"
                          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-[9px] font-black uppercase tracking-widest"
                            style={{ color: 'rgba(255,255,255,0.25)' }}>AI Analysis</p>
                          {[
                            { label: 'Rec. Size',      value: 'M',    color: '#c084fc' },
                            { label: 'Fit Score',      value: '98%',  color: '#34d399' },
                            { label: 'Style Match',    value: 'A+',   color: '#f472b6' },
                          ].map(s => (
                            <div key={s.label} className="flex items-center justify-between py-3 px-4 rounded-xl"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <span className="text-white/40 text-xs font-bold">{s.label}</span>
                              <span className="font-black text-sm" style={{ color: s.color }}>{s.value}</span>
                            </div>
                          ))}
                          <div className="mt-auto p-4 rounded-xl"
                            style={{ background: 'rgba(217,70,239,0.06)', border: '1px solid rgba(217,70,239,0.15)' }}>
                            <p className="text-white/40 text-xs leading-relaxed">
                              Click the image or "View in 3D" to rotate and inspect the result.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── STORE TAB ── */}
            {activeTab === 'store' && (
              <motion.div key="store" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} className="space-y-6 pb-10">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      Virtual <span className="text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>Store</span>
                    </h1>
                    <p className="text-white/35 text-sm mt-1">Browse and try on clothing items.</p>
                  </div>
                  <button onClick={() => setShowCart(v => !v)}
                    className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                    <ShoppingCart className="w-4 h-4" />
                    Cart
                    {cart.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#d946ef,#f472b6)', color: 'white' }}>
                        {cart.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Cart panel */}
                <AnimatePresence>
                  {showCart && (
                    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                      className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col"
                      style={{ background: '#0e0e1c', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-white font-black text-lg">My Cart</p>
                        <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.4)' }}><X className="w-4 h-4" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {cart.length === 0 ? (
                          <div className="h-40 flex flex-col items-center justify-center gap-3">
                            <ShoppingCart className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                            <p className="text-white/25 text-sm font-bold">Cart is empty</p>
                          </div>
                        ) : cart.map(item => (
                          <div key={item.id} className="flex gap-3 p-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="w-14 h-16 rounded-lg overflow-hidden flex-shrink-0"
                              style={{ background: 'rgba(255,255,255,0.06)' }}>
                              {item.image && <img src={item.image} className="w-full h-full object-cover" alt="" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-sm truncate">{item.name}</p>
                              <p className="text-white/40 text-xs">{item.category}</p>
                              <p className="font-black text-sm mt-1" style={{ color: '#d946ef' }}>${item.price.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleRemoveFromCart(item.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: 'rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.7)' }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {cart.length > 0 && (
                        <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex justify-between">
                            <span className="text-white/50 font-bold text-sm">Total</span>
                            <span className="font-black text-white">${cartTotal.toFixed(2)}</span>
                          </div>
                          <button onClick={() => setShowPayment(true)}
                            className="w-full py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                            style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 20px rgba(217,70,239,0.4)' }}>
                            <CreditCard className="w-4 h-4" /> Checkout
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Products grid */}
                {isProductsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full animate-spin"
                      style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
                  </div>
                ) : products.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
                    <ShoppingBag className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-white/30 font-bold">No products yet — add the first one!</p>
                    <button onClick={() => setShowAddProduct(true)}
                      className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                      style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)' }}>
                      Add Product
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {products.map((product, i) => (
                      <motion.div key={product.id}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="group rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {/* Image */}
                        <div className="aspect-[3/4] overflow-hidden relative bg-white/5"
                          onClick={() => setSelectedProduct(product)}>
                          {product.image
                            ? <img src={product.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={product.name} />
                            : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.1)' }} /></div>
                          }
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}>
                            {product.category}
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-white font-black text-sm leading-tight line-clamp-1">{product.name}</p>
                            <p className="font-black text-sm flex-shrink-0" style={{ color: '#d946ef' }}>${product.price.toFixed(2)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => tryProductInStudio(product)}
                              className="py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all hover:scale-105"
                              style={{ background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.25)', color: '#c084fc' }}>
                              <Sparkles className="w-3 h-3" /> Try
                            </button>
                            <button onClick={() => handleAddToCart(product.id)}
                              disabled={cartAdding === product.id}
                              className="py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all hover:scale-105 disabled:opacity-50"
                              style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)', color: '#d946ef' }}>
                              {cartAdding === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ShoppingCart className="w-3 h-3" /> Add</>}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── OCCASION TAB ── */}
            {activeTab === 'occasion' && (
              <motion.div key="occasion" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} className="space-y-6 pb-10">
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    Occasion <span className="text-transparent bg-clip-text"
                      style={{ backgroundImage: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>AI Planner</span>
                  </h1>
                  <p className="text-white/35 text-sm mt-1">Describe your event — AI suggests the perfect outfit.</p>
                </div>

                {/* Input bar */}
                <div className="flex gap-3">
                  <input type="text" value={occasionInput} onChange={e => setOccasionInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleOccasionSuggest()}
                    placeholder="e.g. job interview, beach wedding, casual date night..."
                    className="flex-1 rounded-2xl px-5 py-4 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }} />
                  <button onClick={handleOccasionSuggest}
                    disabled={isOccasionLoading || !occasionInput.trim()}
                    className="px-6 rounded-2xl font-black text-white text-sm flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-30 disabled:pointer-events-none"
                    style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef)', boxShadow: '0 0 24px rgba(217,70,239,0.35)' }}>
                    {isOccasionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {isOccasionLoading ? 'Thinking...' : 'Generate'}
                  </button>
                </div>

                <AnimatePresence>
                  {occasionResult && !occasionResult.error && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                      {/* Two-column: AI image + tags */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Generated outfit image via pollinations.ai */}
                        <div className="rounded-2xl overflow-hidden flex flex-col"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <p className="text-[10px] font-black uppercase tracking-widest px-4 pt-4 pb-2"
                            style={{ color: 'rgba(255,255,255,0.25)' }}>AI Generated Look</p>
                          {occasionImageUrl ? (
                            <div className="relative">
                              <img
                                src={occasionImageUrl}
                                className="w-full object-cover"
                                style={{ maxHeight: '380px', minHeight: '200px' }}
                                alt="AI outfit look"
                                onError={e => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = 'none';
                                  el.nextElementSibling?.removeAttribute('hidden');
                                }}
                              />
                              <div hidden className="h-48 flex flex-col items-center justify-center gap-2 p-4">
                                <Wand2 className="w-8 h-8" style={{ color: 'rgba(217,70,239,0.3)' }} />
                                <p className="text-white/20 text-xs text-center">Image generation unavailable</p>
                              </div>
                            </div>
                          ) : (
                            <div className="h-48 flex flex-col items-center justify-center gap-2">
                              <div className="w-8 h-8 rounded-full animate-spin"
                                style={{ border: '2px solid transparent', borderTopColor: '#d946ef' }} />
                              <p className="text-white/20 text-xs">Generating look...</p>
                            </div>
                          )}
                        </div>

                        {/* Tags + colors */}
                        <div className="space-y-4">
                          <div className="p-5 rounded-2xl space-y-3"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Occasion Info</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: occasionResult.occasion_type, color: '#c084fc' },
                                { label: occasionResult.formality + ' formality', color: '#d946ef' },
                                { label: occasionResult.season, color: '#f472b6' },
                              ].map(tag => (
                                <span key={tag.label} className="px-3 py-1.5 rounded-full text-xs font-bold capitalize"
                                  style={{ background: `${tag.color}15`, border: `1px solid ${tag.color}30`, color: tag.color }}>
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          {occasionResult.recommended_colors?.length > 0 && (
                            <div className="p-5 rounded-2xl"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Recommended Colors</p>
                              <div className="flex flex-wrap gap-2">
                                {occasionResult.recommended_colors.map((c: string) => (
                                  <span key={c} className="px-3 py-1.5 rounded-full text-xs font-bold capitalize"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {occasionResult.avoid?.length > 0 && (
                            <div className="p-4 rounded-2xl"
                              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(239,68,68,0.6)' }}>Avoid</p>
                              <div className="flex flex-wrap gap-2">
                                {occasionResult.avoid.map((a: string) => (
                                  <span key={a} className="text-xs" style={{ color: 'rgba(252,165,165,0.7)' }}>✕ {a}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Outfit suggestions */}
                      {occasionResult.outfit_suggestions?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Outfit Suggestions</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {occasionResult.outfit_suggestions.map((s: any, i: number) => (
                              <div key={i} className="p-4 rounded-2xl space-y-2"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                                    style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef)', color: 'white' }}>{i + 1}</div>
                                  <p className="text-white font-black text-sm">{s.name}</p>
                                </div>
                                <ul className="space-y-1">
                                  {s.items?.map((item: string, j: number) => (
                                    <li key={j} className="text-white/50 text-xs flex items-center gap-1.5">
                                      <span style={{ color: '#d946ef' }}>·</span> {item}
                                    </li>
                                  ))}
                                </ul>
                                <p className="text-white/30 text-[11px] leading-snug pt-1 border-t"
                                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{s.why}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                  {occasionResult?.error && (
                    <p className="text-red-400/70 text-sm">{occasionResult.error}</p>
                  )}
                </AnimatePresence>

                {!occasionResult && !isOccasionLoading && (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.06)' }}>
                    <Wand2 className="w-10 h-10" style={{ color: 'rgba(217,70,239,0.3)' }} />
                    <p className="text-white/25 font-bold text-sm">Type an occasion above and click Generate</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ORDERS TAB ── */}
            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} className="space-y-6 pb-10">
                <div className="flex items-end justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      My <span className="text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>Orders</span>
                    </h1>
                    <p className="text-white/35 text-sm mt-1">Track all your purchases.</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl font-black text-lg"
                    style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.2)', color: '#d946ef' }}>
                    {orders.length}
                  </div>
                </div>

                {isOrdersLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full animate-spin"
                      style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
                    <Package className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-white/30 font-bold">No orders yet</p>
                    <button onClick={() => setActiveTab('store')}
                      className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                      style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)' }}>
                      Browse Store
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }} className="rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {/* Order header */}
                        <div className="flex items-center justify-between px-5 py-4"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
                              <Package className="w-4 h-4" style={{ color: '#34d399' }} />
                            </div>
                            <div>
                              <p className="text-white font-black text-sm">Order #{order.id}</p>
                              <p className="text-white/30 text-xs">
                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide"
                              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                              {order.status}
                            </span>
                            <span className="font-black text-white">${order.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                        {/* Items */}
                        <div className="px-5 py-3 space-y-2">
                          {order.items.map((item, j) => (
                            <div key={j} className="flex items-center justify-between">
                              <p className="text-white/60 text-sm">{item.name} <span className="text-white/30">× {item.quantity}</span></p>
                              <p className="text-white/50 text-sm font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        {/* Footer */}
                        <div className="px-5 py-3 flex items-center gap-4 text-xs text-white/25"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> **** {order.payment_last4}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.shipping_name}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <motion.div key="history"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }} className="space-y-8">

                {/* Header */}
                <div className="flex items-end justify-between">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      Try-On{' '}
                      <span className="text-transparent bg-clip-text"
                        style={{ backgroundImage: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>
                        History
                      </span>
                    </h1>
                    <p className="text-white/35 text-sm mt-1.5 font-medium">
                      All your generated looks in one place.
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl font-black text-lg"
                    style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.2)', color: '#d946ef' }}>
                    {history.length}
                  </div>
                </div>

                {isHistoryLoading ? (
                  <div className="h-80 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 rounded-full animate-spin"
                      style={{ border: '3px solid transparent', borderTopColor: '#d946ef', borderRightColor: '#f472b6' }} />
                    <p className="text-white/25 text-xs font-bold uppercase tracking-widest">Loading...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center gap-5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <HistoryIcon className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 font-black">No history yet</p>
                      <p className="text-white/20 text-sm mt-1">Generate your first try-on in Studio</p>
                    </div>
                    <button onClick={() => setActiveTab('studio')}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
                      style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.25)' }}>
                      Open Studio
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-10">
                    {history.map((item, i) => (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        onClick={() => openViewer(item.result_image)}>

                        {/* Image */}
                        <div className="aspect-[3/4] overflow-hidden relative">
                          <img src={item.result_image} alt="Result"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white text-xs"
                              style={{ background: 'rgba(217,70,239,0.8)', backdropFilter: 'blur(8px)' }}>
                              <Maximize2 className="w-3.5 h-3.5" />
                              View in 3D
                            </div>
                          </div>
                          {/* Clothes strip */}
                          {item.cloth_image && (
                            <div className="absolute bottom-3 left-3 w-12 h-16 rounded-lg overflow-hidden"
                              style={{ border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                              <img src={item.cloth_image} className="w-full h-full object-cover" alt="Cloth" />
                            </div>
                          )}
                        </div>

                        {/* Info bar */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-white/30 text-[10px] font-bold">
                              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-white/60 text-xs font-bold mt-0.5">
                              Size {item.stats?.recommended_size || 'M'} · 98% match
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); downloadImage(item.result_image, `look-${item.id}.png`); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); if (confirm('Delete this look?')) handleDeleteHistory(item.id); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 hover:bg-red-500/20"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PHOTOS TAB ── */}
            {activeTab === 'photos' && (() => {
              const savedModel    = savedPhotos.filter(p => p.category === 'model');
              const savedGarment  = savedPhotos.filter(p => p.category === 'garment');
              const totalModel    = savedModel.length + personHistory.length;
              const totalGarment  = savedGarment.length + clothHistory.length;

              return (
                <motion.div key="photos"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }} className="space-y-8 pb-10">

                  {/* Header */}
                  <div className="flex items-end justify-between">
                    <div>
                      <h1 className="text-3xl font-black text-white tracking-tight">
                        My{' '}
                        <span className="text-transparent bg-clip-text"
                          style={{ backgroundImage: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)' }}>
                          Photos
                        </span>
                      </h1>
                      <p className="text-white/35 text-sm mt-1.5 font-medium">
                        Manage your model photos and garments for quick reuse in Studio.
                      </p>
                    </div>
                    <button onClick={() => { setModalCategory('model'); setModalFile(null); setModalPreview(''); setShowAddPhotoModal(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#c084fc,#d946ef,#f472b6)', boxShadow: '0 0 24px rgba(217,70,239,0.3)' }}>
                      <Plus className="w-4 h-4" />
                      Add Photo
                    </button>
                  </div>

                  {/* ── Model Photos section ── */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c084fc' }}>Model Photos</p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black"
                        style={{ background: 'rgba(192,132,252,0.12)', color: '#c084fc' }}>{totalModel}</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {/* Add card */}
                      <button onClick={() => { setModalCategory('model'); setModalFile(null); setModalPreview(''); setShowAddPhotoModal(true); }}
                        className="group aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        style={{ background: 'rgba(192,132,252,0.04)', border: '1.5px dashed rgba(192,132,252,0.25)' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                          style={{ background: 'rgba(192,132,252,0.12)' }}>
                          <Plus className="w-4 h-4" style={{ color: '#c084fc' }} />
                        </div>
                        <p className="text-[10px] font-bold" style={{ color: 'rgba(192,132,252,0.6)' }}>Add</p>
                      </button>

                      {/* Saved model photos — deletable */}
                      {savedModel.map((photo, i) => (
                        <motion.div key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
                          style={{ border: '1px solid rgba(192,132,252,0.2)' }}>
                          <img src={photo.dataUrl} alt={photo.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2"
                            style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 40%,transparent 55%,rgba(0,0,0,0.75) 100%)' }}>
                            <div className="flex justify-end">
                              <button onClick={() => { if (confirm('Remove this photo?')) deleteSavedPhoto(photo.id); }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(239,68,68,0.85)' }}>
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                            <button onClick={() => usePhotoInStudio(photo.dataUrl, 'model')}
                              className="w-full py-1.5 rounded-xl font-black text-white text-[10px] flex items-center justify-center gap-1"
                              style={{ background: 'rgba(192,132,252,0.85)', backdropFilter: 'blur(8px)' }}>
                              <CheckCircle2 className="w-3 h-3" /> Use
                            </button>
                          </div>
                        </motion.div>
                      ))}

                      {/* History model photos — not deletable */}
                      {personHistory.map((url, i) => (
                        <motion.div key={`ph-${i}`}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (savedModel.length + i) * 0.04 }}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2"
                            style={{ background: 'linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.75) 100%)' }}>
                            <button onClick={() => usePhotoInStudio(url, 'model')}
                              className="w-full py-1.5 rounded-xl font-black text-white text-[10px] flex items-center justify-center gap-1"
                              style={{ background: 'rgba(192,132,252,0.85)', backdropFilter: 'blur(8px)' }}>
                              <CheckCircle2 className="w-3 h-3" /> Use
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* ── Garments section ── */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#f472b6' }}>Garments</p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black"
                        style={{ background: 'rgba(244,114,182,0.12)', color: '#f472b6' }}>{totalGarment}</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {/* Add card */}
                      <button onClick={() => { setModalCategory('garment'); setModalFile(null); setModalPreview(''); setShowAddPhotoModal(true); }}
                        className="group aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        style={{ background: 'rgba(244,114,182,0.04)', border: '1.5px dashed rgba(244,114,182,0.25)' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                          style={{ background: 'rgba(244,114,182,0.12)' }}>
                          <Plus className="w-4 h-4" style={{ color: '#f472b6' }} />
                        </div>
                        <p className="text-[10px] font-bold" style={{ color: 'rgba(244,114,182,0.6)' }}>Add</p>
                      </button>

                      {/* Saved garments — deletable */}
                      {savedGarment.map((photo, i) => (
                        <motion.div key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
                          style={{ border: '1px solid rgba(244,114,182,0.2)' }}>
                          <img src={photo.dataUrl} alt={photo.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2"
                            style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 40%,transparent 55%,rgba(0,0,0,0.75) 100%)' }}>
                            <div className="flex justify-end">
                              <button onClick={() => { if (confirm('Remove this garment?')) deleteSavedPhoto(photo.id); }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(239,68,68,0.85)' }}>
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                            <button onClick={() => usePhotoInStudio(photo.dataUrl, 'garment')}
                              className="w-full py-1.5 rounded-xl font-black text-white text-[10px] flex items-center justify-center gap-1"
                              style={{ background: 'rgba(244,114,182,0.85)', backdropFilter: 'blur(8px)' }}>
                              <CheckCircle2 className="w-3 h-3" /> Use
                            </button>
                          </div>
                        </motion.div>
                      ))}

                      {/* History garments — not deletable */}
                      {clothHistory.map((url, i) => (
                        <motion.div key={`ch-${i}`}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (savedGarment.length + i) * 0.04 }}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2"
                            style={{ background: 'linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.75) 100%)' }}>
                            <button onClick={() => usePhotoInStudio(url, 'garment')}
                              className="w-full py-1.5 rounded-xl font-black text-white text-[10px] flex items-center justify-center gap-1"
                              style={{ background: 'rgba(244,114,182,0.85)', backdropFilter: 'blur(8px)' }}>
                              <CheckCircle2 className="w-3 h-3" /> Use
                            </button>
                          </div>
                        </motion.div>
                      ))}

                      {totalGarment === 0 && (
                        <div className="col-span-3 h-24 flex items-center justify-center rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                          <p className="text-white/20 text-xs font-bold">No garments yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              );
            })()}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
