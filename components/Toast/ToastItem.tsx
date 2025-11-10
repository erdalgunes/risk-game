'use client';

import { useEffect, useRef } from 'react';
import { Toast } from '@/lib/hooks/useToast';

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const toastStyles = {
  success: 'bg-green-600 border-green-500',
  error: 'bg-red-600 border-red-500',
  warning: 'bg-yellow-600 border-yellow-500',
  info: 'bg-blue-600 border-blue-500',
};

const toastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function ToastItem({ toast, onClose }: ToastItemProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toastRef.current?.contains(document.activeElement)) {
        onClose(toast.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toast.id, onClose]);

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={` ${toastStyles[toast.type]} animate-slide-in-right flex items-start gap-3 rounded-lg border-2 p-4 text-white shadow-lg`}
    >
      <span className="text-xl font-bold" aria-hidden="true">
        {toastIcons[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="rounded p-1 text-white transition-colors hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label="Close notification"
        type="button"
      >
        <span aria-hidden="true" className="text-xl font-bold">
          ×
        </span>
      </button>
    </div>
  );
}
