import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('ps_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const q = query(collection(db, 'Users'), where('username', '==', username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.password !== password) return false;

    const loggedUser: User = {
      username: userData.username,
    };

    setUser(loggedUser);
    sessionStorage.setItem('ps_user', JSON.stringify(loggedUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('ps_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
