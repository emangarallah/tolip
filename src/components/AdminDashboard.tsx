import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Settings,
  Lock,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Upload,
  RefreshCw,
  Save,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  Product,
  Category,
  Order,
  StoreSettings,
  AdminStats,
  OrderStatus,
  ProductVariant,
} from '../types/store.ts';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreUpdated: () => void;
}

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'settings' | 'security';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onStoreUpdated,
}) => {
  // Authentication state
  const [token, setToken] = useState<string>(() => localStorage.getItem('tulip_admin_token') || '');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active section
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals inside Admin
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [ordersFilterStatus, setOrdersFilterStatus] = useState<string>('all');
  const [ordersSearch, setOrdersSearch] = useState<string>('');
  const [productsSearch, setProductsSearch] = useState<string>('');
  const [productsCatFilter, setProductsCatFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Security credentials change form
  const [currentPass, setCurrentPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Helper auth headers
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  // Load all admin data
  const loadAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, prodsRes, catsRes, ordersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders() }),
        fetch('/api/products?includeInactive=true', { headers: authHeaders() }),
        fetch('/api/categories?includeInactive=true', { headers: authHeaders() }),
        fetch('/api/orders', { headers: authHeaders() }),
        fetch('/api/settings'),
      ]);

      if (statsRes.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('tulip_admin_token');
        setToken('');
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (prodsRes.ok) setProducts(await prodsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      loadAdminData();
    }
  }, [token, isOpen]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      localStorage.setItem('tulip_admin_token', data.token);
      setToken(data.token);
      setAdminPassword('');
      showToast('مرحباً بك في لوحة تحكم متجر توليب!');
    } catch (err: any) {
      setLoginError(err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tulip_admin_token');
    setToken('');
    setStats(null);
  };

  // -------------------------------------------------------------
  // Product Operations
  // -------------------------------------------------------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    try {
      const isNew = !editingProduct.id;
      const url = isNew ? '/api/products' : `/api/products/${editingProduct.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(editingProduct),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل حفظ المنتج');
      }

      showToast(isNew ? 'تمت إضافة المنتج بنجاح!' : 'تم تحديث بيانات المنتج بنجاح!');
      setEditingProduct(null);
      loadAdminData();
      onStoreUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`هل أنتِ متأكدة من حذف المنتج "${name}" نهائياً من المتجر؟`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showToast('تم حذف المنتج بنجاح');
        loadAdminData();
        onStoreUpdated();
      }
    } catch (err) {
      alert('فشل في حذف المنتج');
    }
  };

  const handleToggleProductStatus = async (product: Product, field: 'isActive' | 'inStock' | 'isFeatured' | 'isBestSeller') => {
    try {
      const updatedValue = !product[field];
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ [field]: updatedValue }),
      });
      if (res.ok) {
        loadAdminData();
        onStoreUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // Category Operations
  // -------------------------------------------------------------
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) return;

    try {
      const isNew = !editingCategory.id;
      const url = isNew ? '/api/categories' : `/api/categories/${editingCategory.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(editingCategory),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل حفظ القسم');
      }

      showToast(isNew ? 'تمت إضافة القسم الجديد بنجاح!' : 'تم تحديث القسم بنجاح!');
      setEditingCategory(null);
      loadAdminData();
      onStoreUpdated();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`هل أنتِ متأكدة من حذف القسم "${name}"؟ سيتم إخفاء المنتجات التابعة له.`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showToast('تم حذف القسم بنجاح');
        loadAdminData();
        onStoreUpdated();
      }
    } catch (err) {
      alert('فشل في حذف القسم');
    }
  };

  // -------------------------------------------------------------
  // Order Operations
  // -------------------------------------------------------------
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast('تم تحديث حالة الطلب بنجاح');
        loadAdminData();
        if (viewingOrder && viewingOrder.id === orderId) {
          setViewingOrder({ ...viewingOrder, status });
        }
      }
    } catch (err) {
      alert('فشل تحديث حالة الطلب');
    }
  };

  // WhatsApp chat with customer
  const handleChatWithCustomer = (order: Order) => {
    const phone = order.customerDetails.phone.replace(/\D/g, '');
    const targetPhone = phone.startsWith('967') ? phone : `967${phone}`;
    const text = encodeURIComponent(
      `مرحبًا ${order.customerDetails.fullName}، معك متجر توليب للعناية الطبيعية بخصوص طلبك رقم (${order.orderNumber}). يسعدنا التواصل معك لتأكيد تفاصيل وموعد التوصيل.`
    );
    window.open(`https://wa.me/${targetPhone}?text=${text}`, '_blank');
  };

  // -------------------------------------------------------------
  // Store Settings Operations
  // -------------------------------------------------------------
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast('تم حفظ إعدادات المتجر بنجاح!');
        onStoreUpdated();
      }
    } catch (err) {
      alert('فشل حفظ الإعدادات');
    }
  };

  // -------------------------------------------------------------
  // Admin Security Update
  // -------------------------------------------------------------
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg('');
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          currentPassword: currentPass,
          newEmail: newEmail || undefined,
          newPassword: newPass || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث كلمة المرور');
      }

      setSecurityMsg('تم تحديث بيانات الدخول بنجاح!');
      setCurrentPass('');
      setNewPass('');
      if (data.token) {
        localStorage.setItem('tulip_admin_token', data.token);
        setToken(data.token);
      }
    } catch (err: any) {
      setSecurityMsg(err.message);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ base64Data, filename: file.name }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          callback(data.url);
          showToast('تم رفع الصورة بنجاح!');
        } else {
          alert(data.error || 'فشل رفع الصورة');
        }
      } catch (err) {
        alert('حدث خطأ أثناء رفع الصورة');
      }
    };
    reader.readAsDataURL(file);
  };

  // Status mapping
  const statusLabels: Record<OrderStatus, { text: string; color: string }> = {
    new: { text: 'جديد', color: 'bg-blue-100 text-blue-800' },
    awaiting_whatsapp_confirmation: { text: 'بانتظار تأكيد واتساب', color: 'bg-amber-100 text-amber-800' },
    confirmed: { text: 'تم التأكيد', color: 'bg-emerald-100 text-emerald-800' },
    processing: { text: 'قيد التجهيز', color: 'bg-purple-100 text-purple-800' },
    out_for_delivery: { text: 'خرج للتوصيل', color: 'bg-indigo-100 text-indigo-800' },
    delivered: { text: 'تم التسليم', color: 'bg-green-100 text-green-800' },
    cancelled: { text: 'ملغي', color: 'bg-red-100 text-red-800' },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-[#161917] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#262C28] overflow-hidden flex flex-col h-[90vh] text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#F0EBE6] dark:border-[#222724] flex items-center justify-between bg-[#FAF8F5] dark:bg-[#121513]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0F4] dark:bg-[#2A161E] border border-[#F5E1E8] dark:border-[#3D202B] flex items-center justify-center text-[#C74169] dark:text-[#E06287]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1F2421] dark:text-white">
                لوحة تحكم صاحب المتجر
              </h2>
              <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                إدارة منتجات وأقسام وطلبات متجر توليب للعناية الطبيعية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {token && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#3D141A] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="إغلاق لوحة التحكم"
              className="p-2 rounded-full hover:bg-white dark:hover:bg-[#1E2320] text-[#6B7280] dark:text-[#A8B0AA] hover:text-[#1F2421] dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-[#2D5237] text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* -------------------------------------------------------------
            NOT LOGGED IN: LOGIN VIEW
        ------------------------------------------------------------- */}
        {!token ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#FCFCFA] dark:bg-[#121513]">
            <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] shadow-xl text-right space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF0F4] dark:bg-[#2A161E] text-[#C74169] dark:text-[#E06287] flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-[#1F2421] dark:text-white">تسجيل دخول الإدارة</h3>
                <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                  خاص بصاحب متجر توليب فقط للوصول إلى إدارة المتجر
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-[#FEE2E2] dark:bg-[#3D141A] border border-[#FCA5A5] dark:border-[#6B202A] text-[#991B1B] dark:text-[#FCA5A5] text-xs font-semibold text-center">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#1F2421] dark:text-white block mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@tulip.ye"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-right bg-[#FCFCFA] dark:bg-[#1E2320] text-[#1F2421] dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1F2421] dark:text-white block mb-1">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    required
                    dir="ltr"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-right bg-[#FCFCFA] dark:bg-[#1E2320] text-[#1F2421] dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-2xl bg-[#1F2421] dark:bg-[#D45278] hover:bg-[#C74169] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <span>جاري التحقق...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>دخول لوحة التحكم</span>
                    </>
                  )}
                </button>
              </form>

              <div className="p-3 rounded-xl bg-[#F8F6F2] dark:bg-[#1E2320] border border-[#EBE4DC] dark:border-[#2D332F] text-[11px] text-[#717772] dark:text-[#8D9690] space-y-1">
                <p className="font-bold text-[#1F2421]">ملاحظة أمان:</p>
                <p>البريد الافتراضي: <span className="font-mono">admin@tulip.ye</span></p>
                <p>كلمة المرور الافتراضية: <span className="font-mono">tulip_admin_secure_2026</span></p>
                <p className="text-[#8C4A5E]">يمكنكِ تغيير البريد وكلمة المرور في أي وقت من قسم الأمان.</p>
              </div>
            </div>
          </div>
        ) : (
          /* -------------------------------------------------------------
              LOGGED IN: DASHBOARD MAIN SHELL
          ------------------------------------------------------------- */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#FCFCFA] dark:bg-[#161917]">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-60 border-b md:border-b-0 md:border-l border-[#F0EBE6] dark:border-[#222724] bg-[#FAF8F5] dark:bg-[#131614] p-3 sm:p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>نظرة عامة وإحصائيات</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>إدارة المنتجات ({products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>إدارة الأقسام ({categories.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>الطلبات ({orders.length})</span>
                {orders.filter((o) => o.status === 'new' || o.status === 'awaiting_whatsapp_confirmation').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#C74169] dark:bg-[#E06287] mr-auto" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>إعدادات المتجر</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>الحساب والأمان</span>
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FCFCFA] dark:bg-[#161917] text-[#1F2421] dark:text-white">
              {/* -------------------------------------------------------------
                  TAB 1: OVERVIEW & STATS
              ------------------------------------------------------------- */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1F2421]">إحصائيات المتجر</h3>
                    <button
                      onClick={loadAdminData}
                      className="p-2 rounded-xl border border-[#D9D2C9] text-xs font-medium hover:bg-white flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>تحديث</span>
                    </button>
                  </div>

                  {/* 4 KPIs grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] shadow-sm">
                      <span className="text-xs text-[#717772]">إجمالي المنتجات</span>
                      <p className="text-2xl font-black text-[#1F2421] mt-1 tabular-nums">
                        {stats?.totalProducts ?? products.length}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] shadow-sm">
                      <span className="text-xs text-[#717772]">أقسام المتجر</span>
                      <p className="text-2xl font-black text-[#1F2421] mt-1 tabular-nums">
                        {stats?.totalCategories ?? categories.length}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] shadow-sm">
                      <span className="text-xs text-[#717772]">إجمالي الطلبات المسجلة</span>
                      <p className="text-2xl font-black text-[#1F2421] mt-1 tabular-nums">
                        {stats?.totalOrders ?? orders.length}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF0F4] border border-[#F5E1E8] shadow-sm">
                      <span className="text-xs text-[#C74169] font-bold">طلبات جديدة وبانتظار واتساب</span>
                      <p className="text-2xl font-black text-[#C74169] mt-1 tabular-nums">
                        {stats?.newOrders ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Sales Note */}
                  <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#EBE4DC] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1F2421]">إجمالي المبيعات المؤكدة:</p>
                      <p className="text-xs text-[#717772]">
                        (يتم احتساب الطلبات التي تحولت إلى "تم التأكيد" أو "تم التسليم" فقط)
                      </p>
                    </div>
                    <p className="text-xl font-extrabold text-[#2D5237] tabular-nums">
                      {(stats?.confirmedRevenue ?? 0).toLocaleString('ar-YE')} ر.ي
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setEditingProduct({
                          name: '',
                          slug: '',
                          categoryId: categories[0]?.id || '',
                          description: '',
                          features: ['طبيعي 100%'],
                          usageInstructions: '',
                          images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
                          variants: [{ id: `v-${Date.now()}`, name: 'حجم قياسي', price: null, stock: 10 }],
                          isFeatured: false,
                          isBestSeller: false,
                          isActive: true,
                          inStock: true,
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#1F2421] text-white text-xs font-bold hover:bg-[#C74169] transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة منتج جديد</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingCategory({
                          name: '',
                          slug: '',
                          description: '',
                          image: '/src/assets/images/product_skincare_cream_1795590418002.jpg',
                          sortOrder: categories.length + 1,
                          isActive: true,
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white border border-[#D9D2C9] text-xs font-bold hover:bg-[#FAF8F5] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة قسم جديد</span>
                    </button>
                  </div>

                  {/* Recent Orders Overview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-[#1F2421]">آخر الطلبات المسجلة:</h4>
                    {orders.length === 0 ? (
                      <p className="text-xs text-[#717772] p-4 bg-white rounded-2xl border border-[#EFE9E2] text-center">
                        لا توجد طلبات مسجلة بعد.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {orders.slice(0, 5).map((ord) => (
                          <div
                            key={ord.id}
                            className="p-3.5 rounded-xl bg-white border border-[#EFE9E2] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-[#1F2421]">{ord.orderNumber}</span>
                              <span className="text-[#6B7280]">{ord.customerDetails.fullName}</span>
                              <span className="text-[#8C938E]">({ord.customerDetails.city})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${statusLabels[ord.status]?.color || 'bg-gray-100'}`}>
                                {statusLabels[ord.status]?.text || ord.status}
                              </span>
                              <button
                                onClick={() => setViewingOrder(ord)}
                                className="px-3 py-1 rounded-lg border border-[#D9D2C9] hover:bg-[#FAF8F5]"
                              >
                                عرض
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 2: PRODUCTS MANAGEMENT
              ------------------------------------------------------------- */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#1F2421]">إدارة المنتجات</h3>
                    <button
                      onClick={() => {
                        setEditingProduct({
                          name: '',
                          slug: '',
                          categoryId: categories[0]?.id || '',
                          description: '',
                          features: ['طبيعي 100%'],
                          usageInstructions: '',
                          images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
                          variants: [{ id: `v-${Date.now()}`, name: 'حجم قياسي', price: null, stock: 10 }],
                          isFeatured: false,
                          isBestSeller: false,
                          isActive: true,
                          inStock: true,
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1F2421] text-white text-xs font-bold hover:bg-[#C74169] transition-all flex items-center gap-2 self-start sm:self-auto shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة منتج جديد</span>
                    </button>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={productsSearch}
                        onChange={(e) => setProductsSearch(e.target.value)}
                        placeholder="ابحثي عن منتج بالاسم أو الوصف..."
                        className="w-full pr-9 pl-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white"
                      />
                      <Search className="w-4 h-4 text-[#9CA3AF] absolute right-3 top-2.5" />
                    </div>

                    <select
                      value={productsCatFilter}
                      onChange={(e) => setProductsCatFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white"
                    >
                      <option value="all">جميع الأقسام</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Products Table / Cards */}
                  <div className="space-y-2">
                    {products
                      .filter((p) => {
                        const matchesCat = productsCatFilter === 'all' || p.categoryId === productsCatFilter;
                        const matchesSearch = !productsSearch.trim() || p.name.includes(productsSearch.trim());
                        return matchesCat && matchesSearch;
                      })
                      .map((prod) => (
                        <div
                          key={prod.id}
                          className="p-3.5 rounded-2xl bg-white border border-[#EFE9E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#D9CFC5] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={prod.images[0] || '/src/assets/images/product_skincare_cream_1795590418002.jpg'}
                              alt=""
                              className="w-14 h-14 rounded-xl object-cover border border-[#EAE3DC] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#1F2421] truncate">{prod.name}</h4>
                                {!prod.isActive && (
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    مخفي
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#717772] truncate">
                                {categories.find((c) => c.id === prod.categoryId)?.name || 'عام'} · {prod.variants.length} أحجام
                              </p>
                              <p className="text-[11px] font-bold text-[#1F2421] tabular-nums mt-0.5">
                                {prod.variants[0]?.price !== null && prod.variants[0]?.price !== undefined
                                  ? `${prod.variants[0].price.toLocaleString('ar-YE')} ر.ي`
                                  : 'تواصل للسعر'}
                              </p>
                            </div>
                          </div>

                          {/* Quick Toggles & Edit */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Stock Toggle */}
                            <button
                              onClick={() => handleToggleProductStatus(prod, 'inStock')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                prod.inStock
                                  ? 'bg-[#EBF5ED] text-[#25D366] border-[#C6ECD1]'
                                  : 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
                              }`}
                            >
                              {prod.inStock ? 'متوفر' : 'نفد'}
                            </button>

                            {/* Visibility Toggle */}
                            <button
                              onClick={() => handleToggleProductStatus(prod, 'isActive')}
                              title={prod.isActive ? 'إخفاء المنتج' : 'نشر المنتج'}
                              className="p-1.5 rounded-lg border border-[#D9D2C9] hover:bg-[#FAF8F5] text-[#555C57]"
                            >
                              {prod.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingProduct({ ...prod })}
                              className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EDE6] text-[#1F2421] border border-[#D9D2C9]"
                              title="تعديل المنتج"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1.5 rounded-lg hover:bg-[#FEE2E2] text-[#DC2626] border border-[#D9D2C9]"
                              title="حذف المنتج"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 3: CATEGORIES MANAGEMENT
              ------------------------------------------------------------- */}
              {activeTab === 'categories' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1F2421]">إدارة أقسام المتجر</h3>
                    <button
                      onClick={() => {
                        setEditingCategory({
                          name: '',
                          slug: '',
                          description: '',
                          image: '/src/assets/images/product_skincare_cream_1795590418002.jpg',
                          sortOrder: categories.length + 1,
                          isActive: true,
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1F2421] text-white text-xs font-bold hover:bg-[#C74169] transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة قسم جديد</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-4 rounded-2xl bg-white border border-[#EFE9E2] flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={cat.image}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-[#EAE3DC] shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#1F2421] truncate">{cat.name}</h4>
                            <p className="text-[11px] text-[#717772] line-clamp-1">{cat.description}</p>
                            <span className="text-[10px] bg-[#FAF8F5] text-[#555C57] px-2 py-0.5 rounded-full inline-block mt-1">
                              ترتيب العرض: {cat.sortOrder}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingCategory({ ...cat })}
                            className="p-1.5 rounded-lg border border-[#D9D2C9] hover:bg-[#FAF8F5]"
                            title="تعديل القسم"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 rounded-lg border border-[#D9D2C9] text-[#DC2626] hover:bg-[#FEE2E2]"
                            title="حذف القسم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 4: ORDERS MANAGEMENT
              ------------------------------------------------------------- */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#1F2421]">إدارة الطلبات الواردة</h3>

                    <div className="flex items-center gap-2">
                      <select
                        value={ordersFilterStatus}
                        onChange={(e) => setOrdersFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white"
                      >
                        <option value="all">جميع الحالات</option>
                        {Object.entries(statusLabels).map(([key, val]) => (
                          <option key={key} value={key}>
                            {val.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Orders Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={ordersSearch}
                      onChange={(e) => setOrdersSearch(e.target.value)}
                      placeholder="ابحثي برقم الطلب، اسم العميل، رقم الهاتف، أو المدينة..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white"
                    />
                    <Search className="w-4 h-4 text-[#9CA3AF] absolute right-3 top-2.5" />
                  </div>

                  {/* Orders Table */}
                  <div className="space-y-3">
                    {orders
                      .filter((o) => {
                        const matchesStatus = ordersFilterStatus === 'all' || o.status === ordersFilterStatus;
                        const q = ordersSearch.trim().toLowerCase();
                        const matchesSearch =
                          !q ||
                          o.orderNumber.toLowerCase().includes(q) ||
                          o.customerDetails.fullName.toLowerCase().includes(q) ||
                          o.customerDetails.phone.includes(q) ||
                          o.customerDetails.city.toLowerCase().includes(q);
                        return matchesStatus && matchesSearch;
                      })
                      .map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl bg-white border border-[#EFE9E2] space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EBE6] pb-2 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-[#1F2421]">{ord.orderNumber}</span>
                              <span className="text-[#8C938E]">
                                {new Date(ord.createdAt).toLocaleDateString('ar-YE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Order Status Select */}
                              <select
                                value={ord.status}
                                onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${statusLabels[ord.status]?.color || 'bg-gray-100'}`}
                              >
                                {Object.entries(statusLabels).map(([stKey, stVal]) => (
                                  <option key={stKey} value={stKey}>
                                    {stVal.text}
                                  </option>
                                ))}
                              </select>

                              {/* WhatsApp Direct Chat button */}
                              <button
                                onClick={() => handleChatWithCustomer(ord)}
                                className="px-3 py-1 rounded-xl bg-[#25D366]/10 text-[#1B8340] hover:bg-[#25D366]/20 font-bold border border-[#25D366]/30 flex items-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                                <span>محادثة واتساب</span>
                              </button>

                              {/* View Details */}
                              <button
                                onClick={() => setViewingOrder(ord)}
                                className="px-3 py-1 rounded-xl border border-[#D9D2C9] hover:bg-[#FAF8F5] font-semibold"
                              >
                                تفاصيل
                              </button>
                            </div>
                          </div>

                          {/* Customer summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#555C57]">
                            <div>
                              <span className="text-[#8C938E] block">العميل:</span>
                              <span className="font-bold text-[#1F2421]">{ord.customerDetails.fullName}</span>
                              <span className="text-[#6B7280] block tabular-nums" dir="ltr">{ord.customerDetails.phone}</span>
                            </div>
                            <div>
                              <span className="text-[#8C938E] block">العنوان:</span>
                              <span className="font-semibold text-[#1F2421]">{ord.customerDetails.city} - {ord.customerDetails.detailedAddress}</span>
                            </div>
                            <div>
                              <span className="text-[#8C938E] block">المنتجات المطلوبة:</span>
                              <span>{ord.items.length} منتجات · الإجمالي: {ord.finalTotal ? `${ord.finalTotal.toLocaleString('ar-YE')} ر.ي` : 'بالاتفاق'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 5: STORE SETTINGS
              ------------------------------------------------------------- */}
              {activeTab === 'settings' && settings && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1F2421]">إعدادات وهوية المتجر</h3>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#1F2421] text-white text-xs font-bold hover:bg-[#C74169] transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </button>
                  </div>

                  {/* Basic Info */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[#C74169]">بيانات المتجر الأساسية</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold block mb-1">اسم المتجر</label>
                        <input
                          type="text"
                          value={settings.storeName}
                          onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1">شعار المتجر (رابط الصورة أو رفع جديد)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={settings.logoUrl}
                            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                            placeholder="اتركيه فارغاً لاستخدام الشعار الرسمي المدمج"
                            className="flex-1 px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                          />
                          <label className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#D9D2C9] hover:bg-[#F2EDE6] text-xs font-medium cursor-pointer flex items-center gap-1 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>رفع</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, (url) => setSettings({ ...settings, logoUrl: url }));
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold block mb-1">وصف المتجر</label>
                      <textarea
                        rows={2}
                        value={settings.storeDescription}
                        onChange={(e) => setSettings({ ...settings, storeDescription: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                      />
                    </div>
                  </div>

                  {/* Contact & WhatsApp */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[#C74169]">روابط التواصل وواتساب</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold block mb-1">رقم واتساب صاحب المتجر</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={settings.whatsappPhone}
                          onChange={(e) => setSettings({ ...settings, whatsappPhone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs text-right"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1">رابط واتساب الرسمي المباشر</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={settings.whatsappOfficialLink}
                          onChange={(e) => setSettings({ ...settings, whatsappOfficialLink: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs text-right"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1">رابط صفحة فيسبوك</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={settings.facebookUrl}
                          onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs text-right"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1">رابط حساب انستغرام</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={settings.instagramUrl}
                          onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero Section Texts */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[#C74169]">نصوص وصورة الواجهة الرئيسية</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold block mb-1">العنوان الرئيسي</label>
                        <input
                          type="text"
                          value={settings.heroHeadline}
                          onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1">صورة الواجهة الرئيسية</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={settings.heroImage}
                            onChange={(e) => setSettings({ ...settings, heroImage: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                          />
                          <label className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#D9D2C9] hover:bg-[#F2EDE6] text-xs font-medium cursor-pointer flex items-center gap-1 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>رفع</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(file, (url) => setSettings({ ...settings, heroImage: url }));
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">النص الفرعي للواجهة</label>
                      <textarea
                        rows={2}
                        value={settings.heroSubtext}
                        onChange={(e) => setSettings({ ...settings, heroSubtext: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                      />
                    </div>
                  </div>

                  {/* Policies Texts */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EFE9E2] space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[#C74169]">سياسات التوصيل والاسترجاع</h4>
                    <div>
                      <label className="text-xs font-semibold block mb-1">سياسة الشحن والتوصيل</label>
                      <textarea
                        rows={3}
                        value={settings.deliveryPolicy}
                        onChange={(e) => setSettings({ ...settings, deliveryPolicy: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">سياسة الاستبدال والاسترجاع</label>
                      <textarea
                        rows={3}
                        value={settings.returnPolicy}
                        onChange={(e) => setSettings({ ...settings, returnPolicy: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs"
                      />
                    </div>
                  </div>
                </form>
              )}

              {/* -------------------------------------------------------------
                  TAB 6: SECURITY & PASSWORD
              ------------------------------------------------------------- */}
              {activeTab === 'security' && (
                <div className="max-w-md space-y-5">
                  <h3 className="text-lg font-bold text-[#1F2421]">تعديل بيانات الحساب والأمان</h3>

                  {securityMsg && (
                    <div className="p-3 rounded-xl bg-[#EAF5EC] border border-[#C5E6CB] text-[#206935] text-xs font-bold">
                      {securityMsg}
                    </div>
                  )}

                  <form onSubmit={handleChangeCredentials} className="p-5 rounded-2xl bg-white border border-[#EFE9E2] space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[#1F2421] block mb-1">
                        كلمة المرور الحالية <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        dir="ltr"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        placeholder="كلمة المرور الحالية"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] text-xs bg-[#FCFCFA]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1F2421] block mb-1">
                        تعديل البريد الإلكتروني (اختياري)
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="البريد الجديد"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] text-xs bg-[#FCFCFA]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#1F2421] block mb-1">
                        كلمة المرور الجديدة (اختياري)
                      </label>
                      <input
                        type="password"
                        dir="ltr"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="لا تقل عن 6 خانات"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#D9D2C9] text-xs bg-[#FCFCFA]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#1F2421] text-white text-xs font-bold hover:bg-[#C74169] transition-all"
                    >
                      تحديث بيانات الدخول
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL: ADD / EDIT PRODUCT
        ------------------------------------------------------------- */}
        {editingProduct && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div
              className="relative w-full max-w-2xl bg-white dark:bg-[#1A1F1C] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#2D3830] overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto text-right text-[#1F2421] dark:text-[#E2DFD9]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE6] dark:border-[#2D3830]">
                <h3 className="text-base font-bold text-[#1F2421] dark:text-white">
                  {editingProduct.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                </h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252C28] text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1 dark:text-gray-200">اسم المنتج *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      placeholder="مثال: كريم تبييض توليب"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1 dark:text-gray-200">القسم التابع له *</label>
                    <select
                      value={editingProduct.categoryId || categories[0]?.id}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-[#1A1F1C]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">وصف المنتج</label>
                  <textarea
                    rows={2}
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                  />
                </div>

                {/* Usage Instructions */}
                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">طريقة الاستخدام (اختياري)</label>
                  <input
                    type="text"
                    value={editingProduct.usageInstructions || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, usageInstructions: e.target.value })}
                    placeholder="مثال: يُوضع على بشرة نظيفة مساءً..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                  />
                </div>

                {/* Image Upload / URL */}
                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">رابط صورة المنتج الرئيسية</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingProduct.images?.[0] || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          images: [e.target.value, ...(editingProduct.images?.slice(1) || [])],
                        })
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                    />
                    <label className="px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#141815] border border-[#D9D2C9] dark:border-[#2D3830] hover:bg-[#F2EDE6] dark:hover:bg-[#202722] font-medium cursor-pointer flex items-center gap-1 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => {
                              setEditingProduct({
                                ...editingProduct,
                                images: [url, ...(editingProduct.images?.slice(1) || [])],
                              });
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* VARIANTS & SIZES MANAGER */}
                <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#141815] border border-[#EFE9E2] dark:border-[#2D3830] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#1F2421] dark:text-white">الأحجام والأنواع والأسعار:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const curVariants = editingProduct.variants || [];
                        setEditingProduct({
                          ...editingProduct,
                          variants: [
                            ...curVariants,
                            { id: `v-${Date.now()}`, name: `حجم ${curVariants.length + 1}`, price: null, stock: 10 },
                          ],
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1A1F1C] border border-[#D9D2C9] dark:border-[#2D3830] text-[11px] font-bold text-[#1F2421] dark:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#202722] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة حجم / نوع</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editingProduct.variants || []).map((v, vIdx) => (
                      <div key={v.id || vIdx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-[#1A1F1C] p-2 rounded-xl border border-[#EAE3DC] dark:border-[#2D3830]">
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const newV = [...(editingProduct.variants || [])];
                              newV[vIdx] = { ...newV[vIdx], name: e.target.value };
                              setEditingProduct({ ...editingProduct, variants: newV });
                            }}
                            placeholder="اسم الحجم (كبير/وسط/صغير)"
                            className="w-full px-2 py-1.5 rounded-lg border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-xs text-[#1F2421] dark:text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={v.price === null || v.price === undefined ? '' : v.price}
                            onChange={(e) => {
                              const newV = [...(editingProduct.variants || [])];
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              newV[vIdx] = { ...newV[vIdx], price: val };
                              setEditingProduct({ ...editingProduct, variants: newV });
                            }}
                            placeholder="السعر (ر.ي)"
                            className="w-full px-2 py-1.5 rounded-lg border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-xs tabular-nums text-left text-[#1F2421] dark:text-white"
                            dir="ltr"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={v.originalPrice === null || v.originalPrice === undefined ? '' : v.originalPrice}
                            onChange={(e) => {
                              const newV = [...(editingProduct.variants || [])];
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              newV[vIdx] = { ...newV[vIdx], originalPrice: val };
                              setEditingProduct({ ...editingProduct, variants: newV });
                            }}
                            placeholder="قبل الخصم"
                            className="w-full px-2 py-1.5 rounded-lg border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-xs tabular-nums text-left text-[#1F2421] dark:text-white"
                            dir="ltr"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const newV = (editingProduct.variants || []).filter((_, idx) => idx !== vIdx);
                              setEditingProduct({ ...editingProduct, variants: newV });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#717772] dark:text-[#9BA19D]">
                    * إذا تُرك السعر فارغاً، سيتم عرض عبارة "تواصل معنا لمعرفة السعر" تلقائياً في المتجر.
                  </p>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#1A1F1C] border border-[#D9D2C9] dark:border-[#2D3830] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.inStock !== false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                    />
                    <span className="dark:text-gray-200">متوفر بالمخزون</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#1A1F1C] border border-[#D9D2C9] dark:border-[#2D3830] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.isFeatured === true}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                    />
                    <span className="dark:text-gray-200">منتج مميز</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#1A1F1C] border border-[#D9D2C9] dark:border-[#2D3830] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.isBestSeller === true}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                    />
                    <span className="dark:text-gray-200">الأكثر طلباً</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#1A1F1C] border border-[#D9D2C9] dark:border-[#2D3830] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.isActive !== false}
                      onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    />
                    <span className="dark:text-gray-200">نشر بالمتجر</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] text-xs font-semibold hover:bg-gray-50 dark:hover:bg-[#252C28]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#1F2421] dark:bg-[#C74169] text-white text-xs font-bold hover:bg-[#C74169] dark:hover:bg-[#a53254]"
                  >
                    حفظ المنتج
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL: ADD / EDIT CATEGORY
        ------------------------------------------------------------- */}
        {editingCategory && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div
              className="relative w-full max-w-md bg-white dark:bg-[#1A1F1C] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#2D3830] overflow-hidden p-6 space-y-4 text-right text-[#1F2421] dark:text-[#E2DFD9]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE6] dark:border-[#2D3830]">
                <h3 className="text-base font-bold text-[#1F2421] dark:text-white">
                  {editingCategory.id ? 'تعديل القسم' : 'إضافة قسم جديد'}
                </h3>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252C28] text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">اسم القسم *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    placeholder="مثال: العناية بالشعر"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">وصف القسم</label>
                  <textarea
                    rows={2}
                    value={editingCategory.description || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">صورة القسم</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingCategory.image || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                    />
                    <label className="px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#141815] border border-[#D9D2C9] dark:border-[#2D3830] hover:bg-[#F2EDE6] dark:hover:bg-[#202722] font-medium cursor-pointer flex items-center gap-1 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => setEditingCategory({ ...editingCategory, image: url }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1 dark:text-gray-200">ترتيب العرض (الرقم الأصغر يظهر أولاً)</label>
                  <input
                    type="number"
                    value={editingCategory.sortOrder || 1}
                    onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-[#1F2421] dark:text-white focus:outline-none focus:border-[#C74169]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 rounded-xl border border-[#D9D2C9] dark:border-[#2D3830] text-xs font-semibold hover:bg-gray-50 dark:hover:bg-[#252C28]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#1F2421] dark:bg-[#C74169] text-white text-xs font-bold hover:bg-[#C74169] dark:hover:bg-[#a53254]"
                  >
                    حفظ القسم
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL: VIEW FULL ORDER DETAILS
        ------------------------------------------------------------- */}
        {viewingOrder && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div
              className="relative w-full max-w-xl bg-white dark:bg-[#1A1F1C] rounded-3xl shadow-2xl border border-[#EFE9E2] dark:border-[#2D3830] overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto text-right text-xs text-[#1F2421] dark:text-[#E2DFD9]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE6] dark:border-[#2D3830]">
                <div>
                  <h3 className="text-base font-bold text-[#1F2421] dark:text-white">
                    تفاصيل الطلب: {viewingOrder.orderNumber}
                  </h3>
                  <p className="text-[11px] text-[#717772] dark:text-[#9BA19D]">
                    تاريخ الطلب: {new Date(viewingOrder.createdAt).toLocaleString('ar-YE')}
                  </p>
                </div>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#252C28] text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Bar */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#141815] border border-[#EFE9E2] dark:border-[#2D3830] flex items-center justify-between">
                <span className="font-bold text-[#1F2421] dark:text-white">حالة الطلب الحالية:</span>
                <select
                  value={viewingOrder.status}
                  onChange={(e) => handleUpdateOrderStatus(viewingOrder.id, e.target.value as OrderStatus)}
                  className={`px-3 py-1.5 rounded-xl font-bold border ${statusLabels[viewingOrder.status]?.color || 'bg-gray-100 dark:bg-zinc-800'}`}
                >
                  {Object.entries(statusLabels).map(([stKey, stVal]) => (
                    <option key={stKey} value={stKey} className="dark:bg-[#1A1F1C]">
                      {stVal.text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141815] border border-[#EFE9E2] dark:border-[#2D3830] space-y-2">
                <h4 className="font-bold text-[#C74169]">بيانات العميل والتوصيل:</h4>
                <div className="grid grid-cols-2 gap-2 text-[#555C57] dark:text-[#BAC0BB]">
                  <p><strong className="text-[#1F2421] dark:text-white">الاسم:</strong> {viewingOrder.customerDetails.fullName}</p>
                  <p><strong className="text-[#1F2421] dark:text-white">رقم الهاتف:</strong> <span dir="ltr">{viewingOrder.customerDetails.phone}</span></p>
                  <p><strong className="text-[#1F2421] dark:text-white">المدينة:</strong> {viewingOrder.customerDetails.city}</p>
                  <p><strong className="text-[#1F2421] dark:text-white">الحي/المنطقة:</strong> {viewingOrder.customerDetails.area || 'غير محدد'}</p>
                  <p className="col-span-2"><strong className="text-[#1F2421] dark:text-white">العنوان التفصيلي:</strong> {viewingOrder.customerDetails.detailedAddress}</p>
                  {viewingOrder.customerDetails.nearestLandmark && (
                    <p className="col-span-2"><strong className="text-[#1F2421] dark:text-white">أقرب معلم:</strong> {viewingOrder.customerDetails.nearestLandmark}</p>
                  )}
                  {viewingOrder.customerDetails.notes && (
                    <p className="col-span-2"><strong className="text-[#1F2421] dark:text-white">ملاحظات التوصيل:</strong> {viewingOrder.customerDetails.notes}</p>
                  )}
                  {viewingOrder.customerDetails.googleMapsUrl && (
                    <p className="col-span-2">
                      <strong className="text-[#1F2421] dark:text-white">رابط الموقع:</strong>{' '}
                      <a
                        href={viewingOrder.customerDetails.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2563EB] dark:text-blue-400 underline inline-flex items-center gap-1"
                      >
                        <span>فتح على خرائط Google</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#1F2421] dark:text-white">المنتجات المطلوبة ({viewingOrder.items.length}):</h4>
                <div className="space-y-1.5 border border-[#EFE9E2] dark:border-[#2D3830] rounded-2xl p-3 bg-[#FAF8F5] dark:bg-[#141815]">
                  {viewingOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-[#EAE3DC] dark:border-[#2D3830] last:border-b-0">
                      <div>
                        <span className="font-bold text-[#1F2421] dark:text-white">{it.productName}</span>
                        <span className="text-[#717772] dark:text-[#9BA19D] text-[11px] mr-2">({it.variantName}) × {it.quantity}</span>
                      </div>
                      <span className="font-bold tabular-nums">
                        {it.totalPrice !== null ? `${it.totalPrice.toLocaleString('ar-YE')} ر.ي` : 'بالاتفاق'}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-bold text-sm text-[#1F2421] dark:text-white">
                    <span>الإجمالي المسجل:</span>
                    <span className="tabular-nums">
                      {viewingOrder.finalTotal ? `${viewingOrder.finalTotal.toLocaleString('ar-YE')} ريال يمني` : 'بالاتفاق عبر واتساب'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => handleChatWithCustomer(viewingOrder)}
                  className="flex-1 py-3 rounded-2xl bg-[#25D366] text-white hover:bg-[#20BA57] font-bold text-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>فتح محادثة واتساب مع العميل</span>
                </button>
                <button
                  onClick={() => setViewingOrder(null)}
                  className="px-5 py-3 rounded-2xl border border-[#D9D2C9] dark:border-[#2D3830] text-xs font-semibold hover:bg-gray-50 dark:hover:bg-[#252C28]"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
