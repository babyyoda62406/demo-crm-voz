import type { IconType } from 'react-icons';
import type { ReactNode } from 'react';
import { FiTool } from 'react-icons/fi';

interface StubViewProps {
  title: string;
  description?: string;
  icon?: IconType;
  children?: ReactNode;
}

/**
 * Placeholder común de las vistas todavía no implementadas: mantiene la ruta
 * viva y el menú coherente mientras la pantalla real no existe.
 */
export const StubView = ({
  title,
  description,
  icon: Icon = FiTool,
  children,
}: StubViewProps) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 drop-shadow-sm">{title}</h1>
              {description && <p className="mt-2 text-gray-700 text-base">{description}</p>}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-lg border border-blue-200/60 bg-blue-50/40 backdrop-blur-md px-4 py-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
            <p className="text-blue-900 font-semibold">En construcción</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};
