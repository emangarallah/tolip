import React, { useState } from 'react';
import { X, PackageSearch, Loader2, CheckCircle2, Clock3, Truck, CircleX } from 'lucide-react';
import { Language } from '../utils/i18n.ts';

interface TrackingModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
}

interface TrackedOrder {
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: { productName: string; variantName: string; quantity: number }[];
  itemsTotal: number | null;
  deliveryFee: number | null;
  finalTotal: number | null;
  deliveryFeeNote?: string;
}

const statusLabels: Record<string, { ar: string; en: string }> = {
  new: { ar: 'طلب جديد', en: 'New order' },
  awaiting_whatsapp_confirmation: { ar: 'بانتظار تأكيد واتساب', en: 'Awaiting WhatsApp confirmation' },
  confirmed: { ar: 'تم تأكيد الطلب', en: 'Confirmed' },
  processing: { ar: 'قيد التجهيز', en: 'Preparing' },
  out_for_delivery: { ar: 'خرج للتوصيل', en: 'Out for delivery' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
  cancelled: { ar: 'تم إلغاء الطلب', en: 'Cancelled' },
};

export const TrackingModal: React.FC<TrackingModalProps> = ({ isOpen, language, onClose }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ar = language === 'ar';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (ar ? 'تعذر العثور على الطلب.' : 'Order not found.'));
      setOrder(data);
    } catch (err: any) {
      setError(err.message || (ar ? 'حدث خطأ، حاول مجددًا.' : 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const status = order ? statusLabels[order.status] : undefined;
  const formatAmount = (value: number | null) => value === null ? (ar ? 'يحدد لاحقًا' : 'To be confirmed') : `${value.toLocaleString(ar ? 'ar-YE' : 'en-US')} ${ar ? 'ر.ي' : 'YER'}`;

  return (
    <div className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <section className="w-full max-w-lg max-h-[90svh] overflow-y-auto rounded-3xl bg-[#FFF9F7] dark:bg-[#151916] border border-[#EFE9E2] dark:border-[#2A302C] shadow-2xl" dir={ar ? 'rtl' : 'ltr'} onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[#F0EBE6] dark:border-[#2A302C]">
          <div className="flex items-center gap-3"><PackageSearch className="w-5 h-5 text-[#C74169]"/><div><h2 className="font-bold text-lg text-[#5B2638] dark:text-white">{ar ? 'تتبع طلبك' : 'Track your order'}</h2><p className="text-xs text-[#8A737B]">{ar ? 'أدخل رقم الطلب ورقم الهاتف' : 'Enter your order number and phone'}</p></div></div>
          <button onClick={onClose} aria-label="Close tracking" className="p-2 rounded-full hover:bg-white dark:hover:bg-[#242B26]"><X className="w-5 h-5"/></button>
        </header>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div><label className="block text-xs font-semibold mb-1.5 text-[#5B2638] dark:text-white">{ar ? 'رقم الطلب' : 'Order number'}</label><input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="TLP-2026-0000" dir="ltr" className="w-full rounded-xl border border-[#E4D8DD] dark:border-[#343C36] bg-white dark:bg-[#1B211D] px-3 py-3 text-sm"/></div>
          <div><label className="block text-xs font-semibold mb-1.5 text-[#5B2638] dark:text-white">{ar ? 'رقم الهاتف المستخدم في الطلب' : 'Phone used for the order'}</label><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxx" dir="ltr" className="w-full rounded-xl border border-[#E4D8DD] dark:border-[#343C36] bg-white dark:bg-[#1B211D] px-3 py-3 text-sm"/></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-[#35191D] p-3 text-xs text-red-700 dark:text-red-300">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-[#C74169] hover:bg-[#B3355A] text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <PackageSearch className="w-4 h-4"/>}{ar ? 'عرض حالة الطلب' : 'Check order status'}</button>
        </form>
        {order && <div className="mx-5 mb-5 rounded-2xl border border-[#EFE9E2] dark:border-[#2A302C] bg-white dark:bg-[#1B211D] p-4 space-y-3">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[11px] text-[#8A737B]">{ar ? 'رقم الطلب' : 'Order number'}</p><p className="font-extrabold text-[#5B2638] dark:text-white" dir="ltr">{order.orderNumber}</p></div><span className="rounded-full bg-[#FFF0F4] dark:bg-[#2A161E] px-3 py-1 text-xs font-bold text-[#C74169] dark:text-[#E06287]">{status ? (ar ? status.ar : status.en) : order.status}</span></div>
          <div className="flex items-center gap-2 text-xs text-[#8A737B]">{order.status === 'delivered' ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : order.status === 'cancelled' ? <CircleX className="w-4 h-4 text-red-500"/> : order.status === 'out_for_delivery' ? <Truck className="w-4 h-4 text-[#C74169]"/> : <Clock3 className="w-4 h-4 text-[#C74169]"/>}<span>{ar ? 'آخر تحديث:' : 'Last updated:'} {new Date(order.updatedAt).toLocaleString(ar ? 'ar-YE' : 'en-US')}</span></div>
          <div className="space-y-2 border-t border-[#F0EBE6] dark:border-[#2A302C] pt-3">{order.items.map((item, index) => <div key={index} className="flex justify-between gap-3 text-xs"><span className="text-[#6F5B63] dark:text-[#C0C9C2]">{item.productName} — {item.variantName} × {item.quantity}</span></div>)}</div>
          <div className="border-t border-[#F0EBE6] dark:border-[#2A302C] pt-3 space-y-1.5 text-xs"><div className="flex justify-between"><span>{ar ? 'المنتجات' : 'Products'}</span><span>{formatAmount(order.itemsTotal)}</span></div><div className="flex justify-between"><span>{ar ? 'التوصيل' : 'Delivery'}</span><span>{formatAmount(order.deliveryFee)}</span></div><div className="flex justify-between font-extrabold text-sm pt-1"><span>{ar ? 'الإجمالي' : 'Total'}</span><span>{formatAmount(order.finalTotal)}</span></div></div>
        </div>}
      </section>
    </div>
  );
};
