import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const UIContext = createContext(null);

/**
 * The notch owns one open panel at a time. `panelRef` exists so the keydown
 * handler can gate typing without subscribing to context updates.
 */
export function UIProvider({ children }) {
  const [panel, setPanel] = useState(null);
  const panelRef = useRef(null);
  panelRef.current = panel;

  useEffect(() => {
    document.body.classList.toggle("panel-open", Boolean(panel));
    if (panel) document.body.classList.remove("typing");
    return () => document.body.classList.remove("panel-open");
  }, [panel]);

  const openPanel = useCallback((name) => setPanel(name), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const togglePanel = useCallback((name) => {
    setPanel((current) => (current === name ? null : name));
  }, []);

  const value = useMemo(
    () => ({ panel, panelRef, openPanel, closePanel, togglePanel }),
    [panel, openPanel, closePanel, togglePanel]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
}
