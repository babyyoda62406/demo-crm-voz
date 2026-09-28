import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalZIndexContextType {
  registerModal: (id: string) => number;
  unregisterModal: (id: string) => void;
  bringToFront: (id: string) => number;
  getZIndex: (id: string) => number;
}

const ModalZIndexContext = createContext<ModalZIndexContextType | undefined>(undefined);

const BASE_Z_INDEX = 50;
const Z_INDEX_INCREMENT = 10;

export const ModalZIndexProvider = ({ children }: { children: ReactNode }) => {
  const [modals, setModals] = useState<Map<string, number>>(new Map());
  const nextZIndexRef = useRef(BASE_Z_INDEX);

  const registerModal = useCallback((id: string): number => {
    const zIndex = nextZIndexRef.current;
    setModals((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, zIndex);
      return newMap;
    });
    nextZIndexRef.current += Z_INDEX_INCREMENT;
    return zIndex;
  }, []);

  const unregisterModal = useCallback((id: string) => {
    setModals((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const bringToFront = useCallback((id: string): number => {
    const newZIndex = nextZIndexRef.current;
    setModals((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, newZIndex);
      return newMap;
    });
    nextZIndexRef.current += Z_INDEX_INCREMENT;
    return newZIndex;
  }, []);

  const getZIndex = useCallback((id: string): number => modals.get(id) ?? BASE_Z_INDEX, [modals]);

  return (
    <ModalZIndexContext.Provider
      value={{ registerModal, unregisterModal, bringToFront, getZIndex }}
    >
      {children}
    </ModalZIndexContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useModalZIndex = (): ModalZIndexContextType => {
  const context = useContext(ModalZIndexContext);
  if (!context) {
    throw new Error('useModalZIndex debe usarse dentro de un ModalZIndexProvider');
  }
  return context;
};
