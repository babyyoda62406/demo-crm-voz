import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
  /**
   * Pide confirmación antes de cerrar por clic fuera o Escape. Pensado para
   * formularios con cambios sin guardar; por defecto el modal cierra directo.
   */
  confirmClose?: boolean;
  confirmCloseMessage?: string;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
  confirmClose = false,
  confirmCloseMessage = 'Hay cambios sin guardar. Si cierras ahora se perderán.',
}: ModalProps) {
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Ajuste de estado durante el render (no en un efecto): al cerrarse el modal
  // la confirmacion pendiente se descarta sin provocar un segundo render con la
  // pregunta todavia en pantalla.
  const [abiertoPrevio, setAbiertoPrevio] = useState(isOpen);
  if (abiertoPrevio !== isOpen) {
    setAbiertoPrevio(isOpen);
    if (!isOpen) setConfirmando(false);
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isOpen) return;
      if (confirmando) {
        setConfirmando(false);
        return;
      }
      if (confirmClose) {
        setConfirmando(true);
        return;
      }
      onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, confirmClose, confirmando]);

  if (!isOpen) return null;

  /** Cierre por gesto ambiguo (clic fuera o Escape): confirma si procede. */
  const solicitarCierre = () => {
    if (confirmClose) setConfirmando(true);
    else onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      onClick={solicitarCierre}
    >
      <div
        className={`backdrop-blur-xl bg-white/30 rounded-xl shadow-2xl border border-white/30 ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-white/30">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900 select-none drop-shadow-sm">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-lg backdrop-blur-sm bg-white/30 text-gray-700 hover:text-gray-900 hover:bg-white/40 transition-colors cursor-pointer select-none ml-auto"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>

      {confirmando && (
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="backdrop-blur-xl bg-white/85 rounded-xl shadow-2xl border border-white/40 max-w-sm w-full p-5">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-gray-900">¿Descartar los cambios?</h3>
                <p className="mt-1 text-sm text-gray-700">{confirmCloseMessage}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-md bg-white/60 text-gray-800 border border-white/40 hover:bg-white/80 transition-colors cursor-pointer select-none"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmando(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-colors cursor-pointer select-none shadow-md"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
