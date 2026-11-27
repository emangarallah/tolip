import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit, Trash2, Save, X, Tag, Search, Upload } from 'lucide-react';
import type { Product, StoreOffer, OfferType } from '../types/store.ts';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog.tsx';

interface Props {
  token: string;
  products: Product[];
  offers: StoreOffer[];
  onOffersChange: React.Dispatch<React.SetStateAction<StoreOffer[]>>;
  onLoadOffers: () => Promise<void>;
  offersLoading: boolean;
  offersError: string;
  onUpdated: () => void;
}
const emptyOffer: Partial<StoreOffer> = { title:'', description:'', image:'', type:'percentage', productIds:[], value:10, bundlePrice:null, buyQuantity:2, getQuantity:1, startsAt:null, endsAt:null, isActive:true };

export const AdminOffers: React.FC<Props> = ({
  token, products, offers, onOffersChange, onLoadOffers, offersLoading, offersError, onUpdated,
}) => {
  const [editing, setEditing] = useState<Partial<StoreOffer> | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<StoreOffer | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const headers = { 'Content-Type':'application/json', Authorization: `Bearer ${token}` };
  const startEdit = (offer?: StoreOffer) => {
    const o = offer || emptyOffer;
    const dateValue = (v?: string | null) => v ? new Date(v).toISOString().slice(0,16) : '';
    setEditing({ ...o, productIds:[...(o.productIds || [])], startsAt:dateValue(o.startsAt), endsAt:dateValue(o.endsAt) });
    setError('');
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    if (!editing.productIds?.length) { setError('اختاري المنتجات المشمولة بالعرض.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { ...editing, startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString() : null, endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString() : null };
      const res = await fetch(editing.id ? `/api/offers/${editing.id}` : '/api/offers', { method:editing.id?'PUT':'POST', headers, body:JSON.stringify(payload) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر حفظ العرض');
      setEditing(null); await onLoadOffers(); onUpdated();
    } catch (e:any) { setError(e.message || 'تعذر حفظ العرض'); } finally { setBusy(false); }
  };
  const remove = (offer: StoreOffer) => {
    setDeleteError('');
    setPendingDelete(offer);
  };
  const confirmRemove = async () => {
    if (!pendingDelete || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(pendingDelete.id)}/delete`, {
        method: 'POST',
        headers,
      });
      const responseText = await res.text();
      let data: { success?: boolean; error?: string } = {};
      try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = {}; }
      if (res.status === 401) {
        throw new Error(data.error || 'انتهت جلسة الإدارة. سجّلي الدخول مجددًا ثم أعيدي المحاولة.');
      }
      if (!res.ok) {
        throw new Error(data.error || `تعذر حذف العرض (رمز الخادم ${res.status}).`);
      }
      if (data.success !== true) {
        throw new Error(data.error || 'لم يؤكد الخادم حذف العرض.');
      }
      // The server confirms the database transaction before the UI removes the card.
      const deletedId = pendingDelete.id;
      onOffersChange(current => current.filter(offer => offer.id !== deletedId));
      setPendingDelete(null);
      setDeleteError('');
      onUpdated();
    } catch (e: any) {
      setDeleteError(e.message || 'تعذر حذف العرض. حاولي مرة أخرى.');
    } finally {
      setDeleteBusy(false);
    }
  };
  const uploadImage = (file:File) => { const reader=new FileReader(); reader.onload=async()=>{ try { const res=await fetch('/api/upload',{method:'POST',headers,body:JSON.stringify({base64Data:reader.result,filename:file.name})}); const data=await res.json(); if(!res.ok) throw new Error(data.error||'فشل رفع الصورة'); setEditing(prev=>prev?({...prev,image:data.url}):prev); } catch(e:any){setError(e.message||'فشل رفع الصورة');} }; reader.readAsDataURL(file); };
  const toggleProduct = (id:string, checked:boolean) => setEditing(prev => prev ? ({...prev, productIds:checked ? [...new Set([...(prev.productIds||[]),id])] : (prev.productIds||[]).filter(x=>x!==id)}) : prev);
  const status = (o:StoreOffer) => !o.isActive ? 'متوقف' : o.startsAt && Date.parse(o.startsAt)>Date.now() ? 'مجدول' : o.endsAt && Date.parse(o.endsAt)<Date.now() ? 'منتهٍ' : 'نشط';
  const filtered = offers.filter(o => o.title.toLowerCase().includes(search.toLowerCase()));
  const input = 'w-full rounded-xl border border-[#D9D2C9] bg-white px-3 py-2.5 text-sm text-[#1F2421] focus:border-[#C74169] focus:outline-none';
  return <section className="space-y-5" dir="rtl">
    {!editing && (
    <>
    {offersError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{offersError}</div>}
    {offersLoading && offers.length === 0 && <div className="rounded-xl border border-[#EFE9E2] bg-white p-5 text-center text-sm text-gray-500">جارٍ تحميل العروض والخصومات...</div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-lg font-bold">إدارة العروض والخصومات</h3><p className="mt-1 text-xs text-gray-500">أنشئي العروض وحددي المنتجات ومدة نشرها.</p></div>
      <button onClick={()=>startEdit()} className="inline-flex items-center gap-2 rounded-xl bg-[#C74169] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4"/> عرض جديد</button>
    </div>
    {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-gray-400"/><input className={input+' pr-9'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحثي عن عرض..."/></div>
    <div className="grid gap-3">
      {filtered.map((o, index)=><motion.article key={o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: Math.min(index * 0.045, 0.24), ease: "easeOut" }} whileHover={{ y: -3 }} className="flex flex-col gap-3 rounded-2xl border border-[#EFE9E2] bg-white p-4 sm:flex-row sm:items-center">
        {o.image ? <img src={o.image} alt="" className="h-16 w-16 rounded-xl object-cover"/> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><Tag/></div>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold">{o.title}</h4><span className="rounded-full bg-gray-100 px-2 py-1 text-[11px]">{status(o)}</span></div><p className="mt-1 text-xs text-gray-500">{o.productIds.length} منتجات · {o.type==='percentage'? `خصم ${o.value}%`:o.type==='fixed'? `خصم ${o.value} ر.ي`:o.type==='bundle'? `حزمة بسعر ${o.bundlePrice} ر.ي`:`اشترِ ${o.buyQuantity} واحصلي على ${o.getQuantity}`}</p><p className="mt-1 text-[11px] text-gray-400">{o.endsAt ? `ينتهي ${new Date(o.endsAt).toLocaleString('ar-YE')}` : 'بدون تاريخ انتهاء'}</p></div>
        <div className="flex gap-2"><button type="button" onClick={()=>startEdit(o)} className="rounded-lg border p-2 text-gray-600" aria-label="تعديل"><Edit className="h-4 w-4"/></button><button type="button" onClick={()=>remove(o)} className="rounded-lg border p-2 text-red-600" aria-label="حذف"><Trash2 className="h-4 w-4"/></button></div>
      </motion.article>)}
      {!filtered.length && !offersLoading && !offersError && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500">لا توجد عروض بعد. أضيفي أول عرض للمتجر.</div>}
    </div>
        </>
    )}
    {editing && <motion.div initial={{ opacity: 0, y: 16, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: "easeOut" }} className="rounded-3xl border border-[#EFE9E2] bg-white p-4 shadow-sm dark:border-[#2D3830] dark:bg-[#1A1F1C]"><form onSubmit={save} className="mx-auto w-full max-w-3xl space-y-4 rounded-3xl bg-white p-1 sm:p-2 dark:bg-[#1A1F1C]">
      <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{editing.id?'تعديل العرض':'إضافة عرض جديد'}</h3><button type="button" onClick={()=>setEditing(null)} className="rounded-full p-2"><X className="h-5 w-5"/></button></div>
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">اسم العرض *<input required className={input+' mt-1'} value={editing.title||''} onChange={e=>setEditing({...editing,title:e.target.value})} placeholder="مثال: خصم 20% على منتجات العناية"/></label>
        <label className="text-xs font-bold">صورة العرض<div className="mt-1 flex gap-2"><input className={input+' mt-1'} value={editing.image||''} onChange={e=>setEditing({...editing,image:e.target.value})} placeholder="أدخلي رابط صورة العرض أو ارفعي صورة"/><label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border px-3 py-2"><Upload className="h-4 w-4"/><span>رفع</span><input type="file" accept="image/*" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)uploadImage(file);}}/></label></div></label>
      </div>
      <label className="block text-xs font-bold">الوصف<textarea className={input+' mt-1'} rows={2} value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="اكتبي تفاصيل العرض وشروط الاستفادة منه"/></label>
      <label className="block text-xs font-bold">نوع العرض<select className={input+' mt-1'} value={editing.type||'percentage'} onChange={e=>setEditing({...editing,type:e.target.value as OfferType})}><option value="percentage">خصم بنسبة مئوية</option><option value="fixed">خصم مبلغ ثابت</option><option value="bundle">مجموعة منتجات بسعر خاص</option><option value="buy_get">اشترِ واحصل على</option></select></label>
      {(editing.type==='percentage'||editing.type==='fixed') && <label className="block text-xs font-bold">{editing.type==='percentage'?'نسبة الخصم %':'مبلغ الخصم (ر.ي)'}<input type="number" min="0" max={editing.type==='percentage'?100:undefined} step="0.01" required className={input+' mt-1'} value={editing.value??0} onChange={e=>setEditing({...editing,value:Number(e.target.value)})} placeholder={editing.type==='percentage'?"مثال: 20":"مثال: 500"}/></label>}
      {editing.type==='bundle' && <label className="block text-xs font-bold">سعر المجموعة (ر.ي)<input type="number" min="0" required className={input+' mt-1'} value={editing.bundlePrice??''} onChange={e=>setEditing({...editing,bundlePrice:Number(e.target.value)})} placeholder="مثال: 5000"/></label>}
      {editing.type==='buy_get' && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">اشترِ كمية<input type="number" min="1" className={input+' mt-1'} value={editing.buyQuantity??2} onChange={e=>setEditing({...editing,buyQuantity:Number(e.target.value)})} placeholder="مثال: 2"/></label><label className="text-xs font-bold">واحصل على<input type="number" min="1" className={input+' mt-1'} value={editing.getQuantity??1} onChange={e=>setEditing({...editing,getQuantity:Number(e.target.value)})} placeholder="مثال: 1"/></label></div>}
      <div><h4 className="mb-1 text-xs font-bold">المنتجات المشمولة *</h4><p className="mb-2 text-[11px] font-normal text-gray-500">حددي منتجًا واحدًا أو أكثر ليشملهم العرض.</p><div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border p-3">{products.filter(p=>p.isActive).map(p=><label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(editing.productIds||[]).includes(p.id)} onChange={e=>toggleProduct(p.id,e.target.checked)}/><span>{p.name}</span></label>)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">بداية العرض<input type="datetime-local" className={input+' mt-1'} value={String(editing.startsAt||'')} onChange={e=>setEditing({...editing,startsAt:e.target.value||null})}/><span className="mt-1 block font-normal text-gray-500">اتركيه فارغًا ليبدأ العرض فورًا.</span></label><label className="text-xs font-bold">نهاية العرض<input type="datetime-local" className={input+' mt-1'} value={String(editing.endsAt||'')} onChange={e=>setEditing({...editing,endsAt:e.target.value||null})}/><span className="mt-1 block font-normal text-gray-500">اتركيه فارغًا إذا لم يكن للعرض تاريخ انتهاء.</span></label></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.isActive!==false} onChange={e=>setEditing({...editing,isActive:e.target.checked})}/> تفعيل العرض</label>
      <div className="flex justify-end gap-2 border-t pt-3"><button type="button" onClick={()=>setEditing(null)} className="rounded-xl border px-4 py-2 text-sm">إلغاء</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#C74169] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?'جارٍ الحفظ...':'حفظ العرض'}</button></div>
    </form></motion.div>}
    <ConfirmDeleteDialog
      isOpen={Boolean(pendingDelete)}
      title="تأكيد حذف العرض"
      description="هل أنتِ متأكدة من حذف هذا العرض؟ لن يظهر للعملاء بعد إتمام الحذف، ولا يمكن التراجع عن العملية."
      itemName={pendingDelete?.title}
      busy={deleteBusy}
      error={deleteError}
      onCancel={() => {
        if (!deleteBusy) {
          setPendingDelete(null);
          setDeleteError('');
        }
      }}
      onConfirm={confirmRemove}
    />
  </section>;
};
