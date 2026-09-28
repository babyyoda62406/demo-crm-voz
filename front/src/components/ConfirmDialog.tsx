import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { Button } from './Button';
import { useModalZIndex } from '../context/ModalZIndexContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const variantButtonClasses: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
  danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white',
  warning:
    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white',
  info: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
};

const variantBorderClasses: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
  danger: 'border-red-500/50',
  warning: 'border-amber-500/50',
  info: 'border-blue-500/50',
};

const variantHeaderClasses: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
  danger: 'bg-red-50/50 border-red-200/50',
  warning: 'bg-amber-50/50 border-amber-200/50',
  info: 'bg-blue-50/50 border-blue-200/50',
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const { registerModal, unregisterModal, bringToFront } = useModalZIndex();
  const [zIndex, setZIndex] = useState(70);
  const modalIdRef = useRef(`confirm-dialog-${useId()}`);

  useEffect(() => {
    const modalId = modalIdRef.current;
    if (isOpen) {
      setZIndex(registerModal(modalId));
      document.body.style.overflow = 'hidden';
    } else {
      unregisterModal(modalId);
      document.body.style.overflow = 'unset';
    }

    return () => {
      unregisterModal(modalId);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, registerModal, unregisterModal]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex }}
      onClick={() => setZIndex(bringToFront(modalIdRef.current))}
    >
      <div
        className={`backdrop-blur-2xl bg-white/50 rounded-2xl shadow-2xl border-2 ${variantBorderClasses[variant]} max-w-md w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between p-5 border-b-2 rounded-t-2xl ${variantHeaderClasses[variant]} select-none`}
        >
          <div className="flex items-center gap-3">
            {variant === 'info' ? (
              <FiInfo className="w-6 h-6 text-blue-600 flex-shrink-0" />
            ) : (
              <FiAlertTriangle
                className={`w-6 h-6 flex-shrink-0 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`}
              />
            )}
            <h2
              className={`text-xl font-bold drop-shadow-sm ${variant === 'danger' ? 'text-red-900' : 'text-gray-900'}`}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-lg backdrop-blur-sm bg-white/40 hover:bg-white/50 transition-colors cursor-pointer select-none"
          >
            <FiX className="w-5 h-5 text-gray-900" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p
            className={`text-base select-none font-medium ${variant === 'danger' ? 'text-red-900' : 'text-gray-900'}`}
          >
            {message}
          </p>
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="secondary" disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              variant="primary"
              disabled={isLoading}
              className={`${variantButtonClasses[variant]} font-semibold shadow-lg`}
            >
              {isLoading ? 'Procesando...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
