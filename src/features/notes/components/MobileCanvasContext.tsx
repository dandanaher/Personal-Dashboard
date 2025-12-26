import { createContext, useContext, ReactNode } from 'react';

interface MobileCanvasContextValue {
  onEditNote?: (noteId: string) => void;
}

const MobileCanvasContext = createContext<MobileCanvasContextValue>({});

export function MobileCanvasProvider({
  children,
  onEditNote,
}: {
  children: ReactNode;
  onEditNote?: (noteId: string) => void;
}) {
  return (
    <MobileCanvasContext.Provider value={{ onEditNote }}>
      {children}
    </MobileCanvasContext.Provider>
  );
}

export function useMobileCanvas() {
  return useContext(MobileCanvasContext);
}
