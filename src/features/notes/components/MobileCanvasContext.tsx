import { createContext, useContext } from 'react';

export interface MobileCanvasContextValue {
  onEditNote?: (noteId: string) => void;
}

export const MobileCanvasContext = createContext<MobileCanvasContextValue>({});

export function useMobileCanvas() {
  return useContext(MobileCanvasContext);
}
