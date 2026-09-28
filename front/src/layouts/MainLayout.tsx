import type { ReactNode } from 'react';
import { useSidebar } from '../context/SidebarContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="h-screen flex flex-col app-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden pt-16">
        <Sidebar />
        {/* Por debajo de `lg` el menú es un cajón superpuesto: el contenido
            ocupa todo el ancho y no se le reserva ningún margen. */}
        <main
          className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out ml-0 ${
            isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}
        >
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
