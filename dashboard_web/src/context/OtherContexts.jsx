import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

// ═══════════════════════════════════════
// THEME CONTEXT
// ═══════════════════════════════════════
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cg_theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cg_theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);

// ═══════════════════════════════════════
// ALERT CONTEXT — notification center
// ═══════════════════════════════════════
const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cg_alerts') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cg_alerts', JSON.stringify(alerts.slice(0, 200)));
  }, [alerts]);

  const addAlert = useCallback(alert => {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      resolved: false,
      note: '',
      ...alert,
    };
    setAlerts(prev => [entry, ...prev]);
  }, []);

  const resolve = useCallback(id => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, resolved: true } : a))
    );
  }, []);

  const addNote = useCallback((id, note) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, note } : a)));
  }, []);

  const clearAll = useCallback(() => setAlerts([]), []);

  const unread = alerts.filter(a => !a.resolved).length;

  return (
    <AlertContext.Provider
      value={{ alerts, addAlert, resolve, addNote, clearAll, unread }}
    >
      {children}
    </AlertContext.Provider>
  );
}
export const useAlerts = () => useContext(AlertContext);
