import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X,
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Settings,
  Lock,
  Mail,
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
import { AdminOffers } from './AdminOffers.tsx';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog.tsx';
import type {
  Product,
  Category,
  Order,
  StoreSettings,
  AdminStats,
  OrderStatus,
  ProductVariant,
  StoreOffer,
} from '../types/store.ts';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreUpdated: () => void;
}

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'offers' | 'settings' | 'security';

interface PageMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const emptyPageMetadata: PageMetadata = {
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onStoreUpdated,
}) => {
  // Authentication state
  const [token, setToken] = useState<string>(() => {
    try {
      // Remove legacy persistent bearer tokens; admin sessions now live per-tab.
      localStorage.removeItem('tulip_admin_token');
      return sessionStorage.getItem('tulip_admin_token') || '';
    } catch {
      return '';
    }
  });
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active section
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<StoreOffer[]>([]);
  const [offerProducts, setOfferProducts] = useState<Product[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState('');
  const offersRequestId = useRef(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrderStatusId, setUpdatingOrderStatusId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals inside Admin
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const productSaveInFlight = useRef(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const categorySaveInFlight = useRef(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [ordersFilterStatus, setOrdersFilterStatus] = useState<string>('all');
  const [ordersSearch, setOrdersSearch] = useState<string>('');
  const [productsSearch, setProductsSearch] = useState<string>('');
  const [productsCatFilter, setProductsCatFilter] = useState<string>('all');
  const [productsPageInfo, setProductsPageInfo] = useState<PageMetadata>(emptyPageMetadata);
  const [ordersPageInfo, setOrdersPageInfo] = useState<PageMetadata>({ ...emptyPageMetadata, pageSize: 10 });
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const productsRequestId = useRef(0);
  const ordersRequestId = useRef(0);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Security credentials change form
  const [currentPass, setCurrentPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const navigateToTab = (tab: AdminTab) => {
    setEditingProduct(null);
    setEditingCategory(null);
    setActiveTab(tab);
  };

  // Helper auth headers
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  // Load promotions and their product choices immediately after admin login,
  // rather than waiting until the offers tab is opened.
  const loadOffers = async () => {
    if (!token) return;
    const requestId = ++offersRequestId.current;
    setOffersLoading(true);
    setOffersError('');
    try {
      const [offersRes, productsRes] = await Promise.all([
        fetch('/api/offers?includeInactive=true', { headers: authHeaders(), cache: 'no-store' }),
        fetch('/api/products?includeInactive=true', { headers: authHeaders(), cache: 'no-store' }),
      ]);
      if (offersRes.status === 401 || productsRes.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!offersRes.ok) throw new Error('تعذر تحميل العروض والخصومات.');
      if (!productsRes.ok) throw new Error('تعذر تحميل المنتجات المرتبطة بالعروض.');
      const [offersData, productsData] = await Promise.all([offersRes.json(), productsRes.json()]);
      if (requestId !== offersRequestId.current) return;
      setOffers(Array.isArray(offersData) ? offersData : []);
      setOfferProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error: any) {
      if (requestId === offersRequestId.current) {
        setOffersError(error.message || 'تعذر تحميل العروض والخصومات.');
      }
    } finally {
      if (requestId === offersRequestId.current) setOffersLoading(false);
    }
  };

  // Refresh only the offers list after deletion; product choices do not need to be reloaded.
  const refreshOffersAfterDelete = async () => {
    if (!token) return;
    const res = await fetch('/api/offers?includeInactive=true', {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!res.ok) throw new Error('تعذر تحديث قائمة العروض بعد الحذف.');
    const data = await res.json();
    setOffers(Array.isArray(data) ? data : []);
  };

  const handleUnauthorized = () => {
    sessionStorage.removeItem('tulip_admin_token');
    setToken('');
  };

  const loadProductsPage = async (
    page = productsPage,
    search = productsSearch,
    categoryId = productsCatFilter
  ) => {
    if (!token) return;
    const requestId = ++productsRequestId.current;
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '12',
        includeInactive: 'true',
      });
      if (search.trim()) params.set('search', search.trim());
      if (categoryId !== 'all') params.set('categoryId', categoryId);

      const res = await fetch(`/api/products?${params.toString()}`, { headers: authHeaders() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error('فشل تحميل صفحة المنتجات');
      const data = await res.json();
      if (requestId !== productsRequestId.current) return;
      setProducts(Array.isArray(data.items) ? data.items : []);
      setProductsPageInfo({
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
        hasPreviousPage: data.hasPreviousPage,
      });
      setProductsPage(data.page);
    } catch (err) {
      console.error('Error fetching products page:', err);
    } finally {
      if (requestId === productsRequestId.current) setProductsLoading(false);
    }
  };

  const loadOrdersPage = async (
    page = ordersPage,
    status = ordersFilterStatus,
    search = ordersSearch
  ) => {
    if (!token) return;
    const requestId = ++ordersRequestId.current;
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/orders?${params.toString()}`, { headers: authHeaders() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error('فشل تحميل صفحة الطلبات');
      const data = await res.json();
      if (requestId !== ordersRequestId.current) return;
      setOrders(Array.isArray(data.items) ? data.items : []);
      setOrdersPageInfo({
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages,
        hasNextPage: data.hasNextPage,
        hasPreviousPage: data.hasPreviousPage,
      });
      setOrdersPage(data.page);
    } catch (err) {
      console.error('Error fetching orders page:', err);
    } finally {
      if (requestId === ordersRequestId.current) setOrdersLoading(false);
    }
  };

  // Load only the summary and category counts on dashboard entry.
  // Product/order pages, offers and settings are fetched when their tabs open.
  const loadAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, catsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders(), cache: 'no-store' }),
        fetch('/api/categories?includeInactive=true', { headers: authHeaders(), cache: 'no-store' }),
      ]);

      if (statsRes.status === 401) {
        handleUnauthorized();
        return;
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setOrders(Array.isArray(statsData.recentOrders) ? statsData.recentOrders : []);
      }
      if (catsRes.ok) setCategories(await catsRes.json());

      const activeTabLoads: Promise<unknown>[] = [];
      if (activeTab === 'products') {
        activeTabLoads.push(loadProductsPage(productsPage, productsSearch, productsCatFilter));
      }
      if (activeTab === 'orders') {
        activeTabLoads.push(loadOrdersPage(ordersPage, ordersFilterStatus, ordersSearch));
      }
      await Promise.all(activeTabLoads);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) void loadAdminData();
  }, [token, isOpen]);

  useEffect(() => {
    if (!isOpen || !token || activeTab !== 'offers') return;
    void loadOffers();
  }, [isOpen, token, activeTab]);

  useEffect(() => {
    if (!isOpen || !token || activeTab !== 'settings' || settings) return;
    let cancelled = false;
    fetch('/api/settings', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('تعذر تحميل إعدادات المتجر.');
        return res.json();
      })
      .then((data) => { if (!cancelled) setSettings(data); })
      .catch((error) => console.error('Error fetching store settings:', error));
    return () => { cancelled = true; };
  }, [isOpen, token, activeTab, settings]);

  useEffect(() => {
    if (!isOpen || !token || activeTab !== 'products') return;
    const timer = window.setTimeout(() => {
      loadProductsPage(productsPage, productsSearch, productsCatFilter);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isOpen, token, activeTab, productsPage, productsSearch, productsCatFilter]);

  useEffect(() => {
    if (!isOpen || !token || activeTab !== 'orders') return;
    const timer = window.setTimeout(() => {
      loadOrdersPage(ordersPage, ordersFilterStatus, ordersSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isOpen, token, activeTab, ordersPage, ordersFilterStatus, ordersSearch]);


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

      sessionStorage.setItem('tulip_admin_token', data.token);
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
    // Revoke the server-side session as well as clearing this browser tab.
    fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() }).catch(() => undefined);
    sessionStorage.removeItem('tulip_admin_token');
    setToken('');
    setStats(null);
  };

  // -------------------------------------------------------------
  // Product Operations
  // -------------------------------------------------------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || productSaveInFlight.current) return;

    productSaveInFlight.current = true;
    setSavingProduct(true);
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
      void Promise.all([loadAdminData(), onStoreUpdated()]).catch((error) => {
        console.error('Product saved, but a background refresh failed:', error);
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      productSaveInFlight.current = false;
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setDeleteError('');
    setPendingDelete({ type: 'product', id, name });
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
    if (!editingCategory || !editingCategory.name || categorySaveInFlight.current) return;

    categorySaveInFlight.current = true;
    setSavingCategory(true);
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
      void Promise.all([loadAdminData(), onStoreUpdated()]).catch((error) => {
        console.error('Category saved, but a background refresh failed:', error);
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      categorySaveInFlight.current = false;
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteError('');
    setPendingDelete({ type: 'category', id, name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const endpoint = pendingDelete.type === 'product'
        ? `/api/products/${pendingDelete.id}`
        : `/api/categories/${pendingDelete.id}`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || (pendingDelete.type === 'product' ? 'فشل في حذف المنتج' : 'فشل في حذف القسم'));
      }
      const deletedType = pendingDelete.type;
      setPendingDelete(null);
      showToast(deletedType === 'product' ? 'تم حذف المنتج بنجاح' : 'تم حذف القسم بنجاح');
      void Promise.all([loadAdminData(), onStoreUpdated()]).catch((error) => {
        console.error('Item deleted, but a background refresh failed:', error);
      });
    } catch (err: any) {
      setDeleteError(err.message || 'تعذر إكمال عملية الحذف. حاولي مرة أخرى.');
    } finally {
      setDeleteBusy(false);
    }
  };

  // -------------------------------------------------------------
  // Order Operations
  // -------------------------------------------------------------
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (updatingOrderStatusId === orderId) return;

    const previousStatus = orders.find((order) => order.id === orderId)?.status
      || (viewingOrder?.id === orderId ? viewingOrder.status : status);
    if (previousStatus === status) return;

    // Reflect the administrator's selection immediately on mobile, then keep it
    // only if the server confirms that the status was saved.
    setUpdatingOrderStatusId(orderId);
    setOrders((current) => current.map((order) =>
      order.id === orderId ? { ...order, status } : order
    ));
    setViewingOrder((current) =>
      current?.id === orderId ? { ...current, status } : current
    );

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        handleUnauthorized();
        throw new Error('انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'تعذر حفظ حالة الطلب. يرجى المحاولة مرة أخرى.');
      }

      setOrders((current) => current.map((order) =>
        order.id === orderId ? { ...order, status: data.status || status } : order
      ));
      setViewingOrder((current) =>
        current?.id === orderId
          ? { ...current, status: data.status || status }
          : current
      );

      await loadAdminData();
      showToast('تم تحديث حالة الطلب بنجاح');
    } catch (err) {
      setOrders((current) => current.map((order) =>
        order.id === orderId ? { ...order, status: previousStatus } : order
      ));
      setViewingOrder((current) =>
        current?.id === orderId ? { ...current, status: previousStatus } : current
      );
      alert(err instanceof Error ? err.message : 'فشل تحديث حالة الطلب');
    } finally {
      setUpdatingOrderStatusId(null);
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
    if (newPass && newPass.length < 12) {
      setSecurityMsg('كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.');
      return;
    }
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
        sessionStorage.setItem('tulip_admin_token', data.token);
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
    <div className="admin-dashboard fixed inset-0 z-[80] h-dvh w-full overflow-hidden bg-[#FCFCFA] dark:bg-[#161917]">
      <div
        className="relative h-full w-full max-w-none overflow-hidden rounded-none border-0 bg-white text-right shadow-none dark:bg-[#161917] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EBE6] bg-[#FAF8F5] p-3 dark:border-[#222724] dark:bg-[#121513] sm:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-[#FFF0F4] dark:bg-[#2A161E] border border-[#F5E1E8] dark:border-[#3D202B] flex items-center justify-center text-[#C74169] dark:text-[#E06287]">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#1F2421] dark:text-white">
                لوحة تحكم صاحب المتجر
              </h2>
              <p className="text-xs text-[#717772] dark:text-[#8D9690]">
                إدارة منتجات وأقسام وطلبات متجر توليب للعناية الطبيعية
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
          <div className="admin-login-content min-h-0 flex-1 overflow-y-auto flex items-center justify-center p-4 bg-[#FCFCFA] dark:bg-[#121513] sm:p-6">
            <div className="admin-login-card w-full max-w-md min-w-0 rounded-3xl p-5 sm:p-8 bg-white dark:bg-[#181C19] border border-[#EFE9E2] dark:border-[#262C28] shadow-xl text-right space-y-6">
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
                  <div className="relative">
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-right bg-[#FCFCFA] dark:bg-[#1E2320] text-[#1F2421] dark:text-white"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717772] dark:text-[#A6AEA8]" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1F2421] dark:text-white block mb-1">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={isLoginPasswordVisible ? 'text' : 'password'}
                      required
                      dir="ltr"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#D9D2C9] dark:border-[#2D332F] focus:border-[#C74169] text-xs text-right bg-[#FCFCFA] dark:bg-[#1E2320] text-[#1F2421] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIsLoginPasswordVisible((visible) => !visible)}
                      aria-label={isLoginPasswordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      title={isLoginPasswordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1 text-[#717772] hover:text-[#C74169] dark:text-[#A6AEA8] dark:hover:text-[#E06287] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C74169] transition-colors"
                    >
                      {isLoginPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                <p>استخدمي بيانات المسؤول التي تم إعدادها بشكل آمن لتسجيل الدخول.</p>
                <p className="text-[#8C4A5E]">لا تعرض صفحة الدخول البريد أو كلمة المرور الافتراضية حفاظًا على أمان لوحة التحكم.</p>
              </div>
            </div>
          </div>
        ) : (
          /* -------------------------------------------------------------
              LOGGED IN: DASHBOARD MAIN SHELL
          ------------------------------------------------------------- */
          <div className="admin-layout min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden bg-[#FCFCFA] dark:bg-[#161917] md:flex-row">
            {/* Sidebar Navigation */}
            <div className="admin-sidebar w-full max-w-full shrink-0 border-b border-[#F0EBE6] bg-[#FAF8F5] p-2 dark:border-[#222724] dark:bg-[#131614] flex gap-1.5 overflow-x-auto overscroll-x-contain md:w-60 md:flex-col md:overflow-visible md:border-b-0 md:border-l md:p-4">
              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('overview')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>نظرة عامة وإحصائيات</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('products')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'products'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>إدارة المنتجات ({stats?.totalProducts ?? products.length})</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('categories')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>إدارة الأقسام ({stats?.totalCategories ?? categories.length})</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('orders')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>الطلبات ({stats?.totalOrders ?? orders.length})</span>
                {(stats?.newOrders ?? orders.filter((o) => o.status === 'new' || o.status === 'awaiting_whatsapp_confirmation').length) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#C74169] dark:bg-[#E06287] mr-auto" />
                )}
              </motion.button>

              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('offers')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'offers' ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm' : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>العروض والخصومات</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('settings')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>إعدادات المتجر</span>
              </motion.button>

              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                onClick={() => navigateToTab('security')}
                className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'bg-[#1F2421] text-white dark:bg-[#D45278] shadow-sm'
                    : 'text-[#555C57] dark:text-[#A8B0AA] hover:bg-[#EFE9E2] dark:hover:bg-[#1C211E]'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>الحساب والأمان</span>
              </motion.button>
            </div>

            {/* Main Content Area */}
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: "easeOut" }} className="admin-main-content min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto p-3 bg-[#FCFCFA] text-[#1F2421] dark:bg-[#161917] dark:text-white sm:p-6">
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
                          variants: [{ id: `v-${crypto.randomUUID()}`, name: 'حجم قياسي', price: null, stock: 10 }],
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
                      className="px-4 py-3 min-h-11 rounded-xl bg-[#C74169] text-white border border-[#A92F53] text-xs font-extrabold hover:bg-[#A92F53] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#C74169]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E06287] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161917]"
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
                            className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#EFE9E2] bg-white p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-3.5"
                          >
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                              <span className="shrink-0 font-mono font-bold text-[#1F2421]">{ord.orderNumber}</span>
                              <span className="min-w-0 break-words text-[#6B7280]">{ord.customerDetails.fullName}</span>
                              <span className="text-[#8C938E]">{ord.customerDetails.city}</span>
                            </div>
                            <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-3">
                              <span className={`rounded-full px-2.5 py-1 font-bold text-[11px] leading-5 ${statusLabels[ord.status]?.color || 'bg-gray-100'}`}>
                                {statusLabels[ord.status]?.text || ord.status}
                              </span>
                              <button
                                onClick={() => setViewingOrder(ord)}
                                className="shrink-0 rounded-lg border border-[#D9D2C9] px-3 py-1.5 hover:bg-[#FAF8F5]"
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
                          variants: [{ id: `v-${crypto.randomUUID()}`, name: 'حجم قياسي', price: null, stock: 10 }],
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
                        onChange={(e) => { setProductsSearch(e.target.value); setProductsPage(1); }}
                        placeholder="ابحثي عن منتج بالاسم أو الوصف..."
                        className="w-full pr-9 pl-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white"
                      />
                      <Search className="w-4 h-4 text-[#9CA3AF] absolute right-3 top-2.5" />
                    </div>

                    <select
                      value={productsCatFilter}
                      onChange={(e) => { setProductsCatFilter(e.target.value); setProductsPage(1); }}
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
                    {products.map((prod) => (
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

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EFE9E2]">
                    <span className="text-[11px] text-[#717772]">
                      {productsLoading ? 'جارٍ تحميل المنتجات...' : `عرض ${products.length} من ${productsPageInfo.total} منتج · صفحة ${productsPageInfo.page} من ${Math.max(1, productsPageInfo.totalPages)}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!productsPageInfo.hasPreviousPage || productsLoading}
                        onClick={() => setProductsPage((current) => Math.max(1, current - 1))}
                        className="px-3 py-2 rounded-lg border border-[#D9D2C9] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        disabled={!productsPageInfo.hasNextPage || productsLoading}
                        onClick={() => setProductsPage((current) => current + 1)}
                        className="px-3 py-2 rounded-lg border border-[#D9D2C9] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        التالي
                      </button>
                    </div>
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
                      className="px-4 py-3 min-h-11 rounded-xl bg-[#C74169] text-white border border-[#A92F53] text-xs font-extrabold hover:bg-[#A92F53] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#C74169]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E06287] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161917]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة قسم جديد</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="min-w-0 rounded-2xl bg-white border border-[#EFE9E2] p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <img
                            src={cat.image}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-[#EAE3DC] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-[#1F2421] truncate">{cat.name}</h4>
                            <p className="text-[11px] text-[#717772] line-clamp-1">{cat.description}</p>
                            <span className="text-[10px] bg-[#FAF8F5] text-[#555C57] px-2 py-0.5 rounded-full inline-block mt-1">
                              ترتيب العرض: {cat.sortOrder}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                          <button
                            onClick={() => setEditingCategory({ ...cat })}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D9D2C9] p-0 hover:bg-[#FAF8F5]"
                            title="تعديل القسم"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D9D2C9] p-0 text-[#DC2626] hover:bg-[#FEE2E2]"
                            title="حذف القسم"
                          >
                            <Trash2 className="h-4 w-4" />
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

                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <select
                        value={ordersFilterStatus}
                        onChange={(e) => { setOrdersFilterStatus(e.target.value); setOrdersPage(1); }}
                        className="w-full max-w-full px-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white sm:w-auto"
                      >
                        <option value="all">جميع الحالات</option>
                        {Object.entries(statusLabels).map(([key, val]) => (
                          <option key={key} value={key}>
                            {key === 'awaiting_whatsapp_confirmation' ? 'بانتظار تأكيد الواتساب' : val.text}
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
                      onChange={(e) => { setOrdersSearch(e.target.value); setOrdersPage(1); }}
                      placeholder="ابحثي برقم الطلب، اسم العميل، رقم الهاتف، أو المدينة..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-[#D9D2C9] text-xs bg-white"
                    />
                    <Search className="w-4 h-4 text-[#9CA3AF] absolute right-3 top-2.5" />
                  </div>

                  {/* Orders Table */}
                  <div className="space-y-3">
                    {orders.map((ord) => (
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

                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                              {/* Order Status Select */}
                              <select
                                value={ord.status}
                                disabled={updatingOrderStatusId === ord.id}
                                onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                                className={`w-full min-w-max basis-full shrink-0 whitespace-nowrap rounded-xl border px-2.5 py-2 text-xs font-bold disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:basis-auto sm:py-1 ${statusLabels[ord.status]?.color || 'bg-gray-100'}`}
                              >
                                {Object.entries(statusLabels).map(([stKey, stVal]) => (
                                  <option key={stKey} value={stKey}>
                                    {stKey === 'awaiting_whatsapp_confirmation' ? 'بانتظار تأكيد الواتساب' : stVal.text}
                                  </option>
                                ))}
                              </select>

                              {/* WhatsApp Direct Chat button */}
                              <button
                                onClick={() => handleChatWithCustomer(ord)}
                                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-2 font-bold text-[#1B8340] hover:bg-[#25D366]/20 sm:flex-none sm:py-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                                <span>محادثة واتساب</span>
                              </button>

                              {/* View Details */}
                              <button
                                onClick={() => setViewingOrder(ord)}
                                className="flex flex-1 items-center justify-center rounded-xl border border-[#D9D2C9] px-3 py-2 font-semibold hover:bg-[#FAF8F5] sm:flex-none sm:py-1"
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

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EFE9E2]">
                    <span className="text-[11px] text-[#717772]">
                      {ordersLoading ? 'جارٍ تحميل الطلبات...' : `عرض ${orders.length} من ${ordersPageInfo.total} طلب · صفحة ${ordersPageInfo.page} من ${Math.max(1, ordersPageInfo.totalPages)}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!ordersPageInfo.hasPreviousPage || ordersLoading}
                        onClick={() => setOrdersPage((current) => Math.max(1, current - 1))}
                        className="px-3 py-2 rounded-lg border border-[#D9D2C9] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        السابق
                      </button>
                      <button
                        type="button"
                        disabled={!ordersPageInfo.hasNextPage || ordersLoading}
                        onClick={() => setOrdersPage((current) => current + 1)}
                        className="px-3 py-2 rounded-lg border border-[#D9D2C9] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 5: STORE SETTINGS
              ------------------------------------------------------------- */}
              {activeTab === 'offers' && (
                <AdminOffers
                  token={token}
                  products={offerProducts}
                  offers={offers}
                  onOffersChange={setOffers}
                  onLoadOffers={loadOffers}
                  onRefreshAfterDelete={refreshOffersAfterDelete}
                  onDeleteSuccess={() => showToast('تم حذف العرض بنجاح.')}
                  onSaveSuccess={(message) => showToast(message)}
                  offersLoading={offersLoading}
                  offersError={offersError}
                  onUpdated={() => { loadAdminData(); onStoreUpdated(); }}
                />
              )}

              {activeTab === 'settings' && !settings && (
                <div className="rounded-2xl border border-[#EFE9E2] bg-white p-6 text-center text-sm text-[#717772] dark:border-[#2D3830] dark:bg-[#1A1F1C] dark:text-[#A8B0AA]">
                  جارٍ تحميل إعدادات المتجر...
                </div>
              )}
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
            </motion.div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL: ADD / EDIT PRODUCT
        ------------------------------------------------------------- */}
        {editingProduct && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }} className="admin-form-overlay absolute inset-x-0 bottom-0 top-[132px] z-30 w-full max-w-full overflow-x-hidden overflow-y-auto bg-white p-3 dark:bg-[#161917] sm:p-5 md:right-60 md:top-[76px]">
            <div
              className="relative mx-auto w-full max-w-3xl min-w-0 space-y-4 overflow-visible rounded-none border-0 bg-white p-2 text-right text-[#1F2421] shadow-none dark:bg-[#161917] dark:text-[#E2DFD9] sm:p-4"
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
                            { id: `v-${crypto.randomUUID()}`, name: `حجم ${curVariants.length + 1}`, price: null, stock: 10 },
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
                      <div key={v.id || vIdx} className="grid grid-cols-2 items-center gap-2 rounded-xl border border-[#EAE3DC] bg-white p-2 dark:border-[#2D3830] dark:bg-[#1A1F1C] sm:grid-cols-12">
                        <div className="col-span-2 min-w-0 sm:col-span-4">
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
                        <div className="col-span-1 min-w-0 sm:col-span-2">
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
                        <div className="col-span-1 min-w-0 sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={v.originalPrice === null || v.originalPrice === undefined ? '' : v.originalPrice}
                            onChange={(e) => {
                              const newV = [...(editingProduct.variants || [])];
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              newV[vIdx] = { ...newV[vIdx], originalPrice: val };
                              setEditingProduct({ ...editingProduct, variants: newV });
                            }}
                            placeholder="قبل الخصم"
                            aria-label="السعر السابق"
                            className="w-full px-2 py-1.5 rounded-lg border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-xs tabular-nums text-left text-[#1F2421] dark:text-white"
                            dir="ltr"
                          />
                        </div>
                        <div className="col-span-1 min-w-0 sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={v.stock ?? 0}
                            onChange={(e) => {
                              const newV = [...(editingProduct.variants || [])];
                              const stock = e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value)));
                              newV[vIdx] = { ...newV[vIdx], stock };
                              setEditingProduct({ ...editingProduct, variants: newV });
                            }}
                            placeholder="المخزون"
                            aria-label="المخزون المتاح"
                            className="w-full px-2 py-1.5 rounded-lg border border-[#D9D2C9] dark:border-[#2D3830] bg-white dark:bg-[#121513] text-xs tabular-nums text-left text-[#1F2421] dark:text-white"
                            dir="ltr"
                          />
                        </div>
                        <div className="col-span-2 flex justify-start sm:col-span-2 sm:justify-end">
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
                    disabled={savingProduct}
                    className="px-6 py-2 rounded-xl bg-[#1F2421] dark:bg-[#C74169] text-white text-xs font-bold hover:bg-[#C74169] dark:hover:bg-[#a53254] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProduct ? 'جارٍ حفظ المنتج...' : 'حفظ المنتج'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* -------------------------------------------------------------
            MODAL: ADD / EDIT CATEGORY
        ------------------------------------------------------------- */}
        {editingCategory && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }} className="admin-form-overlay absolute inset-x-0 bottom-0 top-[132px] z-30 w-full max-w-full overflow-x-hidden overflow-y-auto bg-white p-3 dark:bg-[#161917] sm:p-5 md:right-60 md:top-[76px]">
            <div
              className="relative mx-auto w-full max-w-2xl space-y-4 overflow-visible rounded-none border-0 bg-white p-2 shadow-none text-right text-[#1F2421] dark:bg-[#161917] dark:text-[#E2DFD9]"
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
                    disabled={savingCategory}
                    className="px-6 py-2 rounded-xl bg-[#1F2421] dark:bg-[#C74169] text-white text-xs font-bold hover:bg-[#C74169] dark:hover:bg-[#a53254] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCategory ? 'جارٍ حفظ القسم...' : 'حفظ القسم'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* -------------------------------------------------------------
            MODAL: VIEW FULL ORDER DETAILS
        ------------------------------------------------------------- */}
        {viewingOrder && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div
              className="admin-order-dialog relative w-full min-w-0 max-w-xl overflow-x-hidden overflow-y-auto rounded-3xl border border-[#EFE9E2] bg-white p-4 text-right text-xs text-[#1F2421] shadow-2xl dark:border-[#2D3830] dark:bg-[#1A1F1C] dark:text-[#E2DFD9] sm:p-6"
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
              <div className="flex flex-col items-stretch justify-between gap-2 rounded-2xl border border-[#EFE9E2] bg-[#FAF8F5] p-3 dark:border-[#2D3830] dark:bg-[#141815] sm:flex-row sm:items-center">
                <span className="font-bold text-[#1F2421] dark:text-white">حالة الطلب الحالية:</span>
                <select
                  value={viewingOrder.status}
                  disabled={updatingOrderStatusId === viewingOrder.id}
                  onChange={(e) => handleUpdateOrderStatus(viewingOrder.id, e.target.value as OrderStatus)}
                  className={`px-3 py-1.5 rounded-xl font-bold border disabled:cursor-wait disabled:opacity-70 ${statusLabels[viewingOrder.status]?.color || 'bg-gray-100 dark:bg-zinc-800'}`}
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
                <div className="grid grid-cols-1 gap-2 text-[#555C57] dark:text-[#BAC0BB] sm:grid-cols-2">
                  <p><strong className="text-[#1F2421] dark:text-white">الاسم:</strong> {viewingOrder.customerDetails.fullName}</p>
                  <p><strong className="text-[#1F2421] dark:text-white">رقم الهاتف:</strong> <span dir="ltr">{viewingOrder.customerDetails.phone}</span></p>
                  <p><strong className="text-[#1F2421] dark:text-white">المدينة:</strong> {viewingOrder.customerDetails.city}</p>
                  <p><strong className="text-[#1F2421] dark:text-white">الحي/المنطقة:</strong> {viewingOrder.customerDetails.area || 'غير محدد'}</p>
                  <p className="col-span-full sm:col-span-2"><strong className="text-[#1F2421] dark:text-white">العنوان التفصيلي:</strong> {viewingOrder.customerDetails.detailedAddress}</p>
                  {viewingOrder.customerDetails.nearestLandmark && (
                    <p className="col-span-full sm:col-span-2"><strong className="text-[#1F2421] dark:text-white">أقرب معلم:</strong> {viewingOrder.customerDetails.nearestLandmark}</p>
                  )}
                  {viewingOrder.customerDetails.notes && (
                    <p className="col-span-full sm:col-span-2"><strong className="text-[#1F2421] dark:text-white">ملاحظات التوصيل:</strong> {viewingOrder.customerDetails.notes}</p>
                  )}
                  {viewingOrder.customerDetails.googleMapsUrl && (
                    <p className="col-span-full sm:col-span-2">
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
                    <div key={idx} className="flex flex-col items-start justify-between gap-1 border-b border-[#EAE3DC] py-1 last:border-b-0 dark:border-[#2D3830] sm:flex-row sm:items-center">
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
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3">
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
        <ConfirmDeleteDialog
          isOpen={Boolean(pendingDelete)}
          title={pendingDelete?.type === 'product' ? 'تأكيد حذف المنتج' : 'تأكيد حذف القسم'}
          description={pendingDelete?.type === 'product'
            ? 'هل أنتِ متأكدة من حذف هذا المنتج نهائياً من المتجر؟ لا يمكن التراجع عن هذه العملية.'
            : 'هل أنتِ متأكدة من حذف هذا القسم؟ قد يتم إخفاء المنتجات التابعة له من واجهة المتجر.'}
          itemName={pendingDelete?.name}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (!deleteBusy) {
              setPendingDelete(null);
              setDeleteError('');
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
};
