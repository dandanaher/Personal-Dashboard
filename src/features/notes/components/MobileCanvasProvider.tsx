import type { ReactNode } from 'react';
import { MobileCanvasContext } from './MobileCanvasContext';

interface MobileCanvasProviderProps {
  children: ReactNode;
  onEditNote?: (noteId: string) => void;
}

export function MobileCanvasProvider({ children, onEditNote }: MobileCanvasProviderProps) {
  return (
    <MobileCanvasContext.Provider value={{ onEditNote }}>
      {children}
    </MobileCanvasContext.Provider>
  );
}

export default MobileCanvasProvider;
