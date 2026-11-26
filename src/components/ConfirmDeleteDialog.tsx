import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName?: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  title,
  description,
  itemName,
  confirmLabel = 'نعم، احذف',
  busy = false,
  error = '',
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171A18]/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#F1E7E8] bg-white p-6 text-right shadow-[0_24px_80px_rgba(30,20,25,0.25)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 dark:border-[#3D2B30] dark:bg-[#1A1F1C]"
        dir="rtl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F8D9DE] bg-[#FFF0F2] text-[#C2415D] dark:border-[#63313D] dark:bg-[#3A2028] dark:text-[#F18AA0]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="إغلاق رسالة التأكيد"
            className="rounded-full p-2 text-[#7A817C] transition hover:bg-[#F5F2EF] hover:text-[#1F2421] disabled:opacity-40 dark:hover:bg-[#2A302C] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 id="delete-dialog-title" className="text-lg font-extrabold text-[#1F2421] dark:text-white">
            {title}
          </h3>
          <p id="delete-dialog-description" className="mt-2 text-sm leading-7 text-[#69716B] dark:text-[#B3BBB5]">
            {description}
          </p>
          {itemName && (
            <div className="mt-3 rounded-xl border border-[#F0E7E2] bg-[#FAF7F4] px-3 py-2.5 text-sm font-bold text-[#373D39] dark:border-[#343B36] dark:bg-[#222824] dark:text-[#E7EAE7]">
              {itemName}
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-[#DED8D2] px-4 py-3 text-sm font-bold text-[#454D47] transition hover:bg-[#F8F5F2] disabled:opacity-50 dark:border-[#3B443E] dark:text-[#D6DCD7] dark:hover:bg-[#252C28]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#C2415D] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#C2415D]/15 transition hover:bg-[#A9324D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? 'جارٍ الحذف...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};
