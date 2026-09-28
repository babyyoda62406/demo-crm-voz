import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  /** Clases de color del enum correspondiente (`...Colors`). */
  className?: string;
}

/** Píldora de estado reutilizada en tablas, tarjetas y ficha. */
export const Badge = ({ children, className = '' }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap select-none ${className}`}
  >
    {children}
  </span>
);
