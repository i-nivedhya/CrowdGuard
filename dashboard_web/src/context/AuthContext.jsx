import { createContext, useContext, useState, useEffect } from 'react';

// ─── Default users (in real app these come from backend) ───
const DEFAULT_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    name: 'Super Admin',
    role: 'super_admin',
    avatar: 'SA',
  },
  {
    id: 2,
    username: 'manager',
    password: 'manager123',
    name: 'Venue Manager',
    role: 'venue_manager',
    avatar: 'VM',
  },
  {
    id: 3,
    username: 'guard',
    password: 'guard123',
    name: 'Security Guard',
    role: 'security_guard',
    avatar: 'SG',
  },
  {
    id: 4,
    username: 'police',
    password: 'police123',
    name: 'Police Officer',
    role: 'read_only',
    avatar: 'PO',
  },
];

// ─── Role permissions ───
export const PERMISSIONS = {
  super_admin: [
    'dashboard',
    'analytics',
    'settings',
    'users',
    'recordings',
    'screenshots',
    'about',
  ],
  venue_manager: [
    'dashboard',
    'analytics',
    'settings',
    'recordings',
    'screenshots',
    'about',
  ],
  security_guard: ['dashboard', 'recordings', 'screenshots', 'about'],
  read_only: ['dashboard', 'about'],
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  venue_manager: 'Venue Manager',
  security_guard: 'Security Guard',
  read_only: 'Read Only',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('cg_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  // Restore session on load
  useEffect(() => {
    const saved = localStorage.getItem('cg_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Persist users
  useEffect(() => {
    localStorage.setItem('cg_users', JSON.stringify(users));
  }, [users]);

  function login(username, password) {
    const found = users.find(
      u => u.username === username && u.password === password
    );
    if (!found) return { ok: false, error: 'Invalid username or password' };
    const session = { ...found, loginTime: new Date().toISOString() };
    delete session.password;
    setUser(session);
    localStorage.setItem('cg_session', JSON.stringify(session));
    return { ok: true, user: session };
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('cg_session');
  }

  function can(page) {
    if (!user) return false;
    return PERMISSIONS[user.role]?.includes(page) ?? false;
  }

  function isAtLeast(role) {
    const order = [
      'read_only',
      'security_guard',
      'venue_manager',
      'super_admin',
    ];
    return order.indexOf(user?.role) >= order.indexOf(role);
  }

  function addUser(newUser) {
    const u = {
      ...newUser,
      id: Date.now(),
      avatar: newUser.name.slice(0, 2).toUpperCase(),
    };
    setUsers(prev => [...prev, u]);
  }

  function removeUser(id) {
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        can,
        isAtLeast,
        addUser,
        removeUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
