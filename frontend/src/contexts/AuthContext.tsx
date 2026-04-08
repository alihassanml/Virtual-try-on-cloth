import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: { name: string; token: string } | null;
  login: (name: string, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ name: string; token: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    const name = Cookies.get('userName');
    if (token && name) {
      setUser({ token, name });
    }
    setIsLoading(false);
  }, []);

  const login = (name: string, token: string) => {
    Cookies.set('token', token, { expires: 7 }); // expires in 7 days
    Cookies.set('userName', name, { expires: 7 });
    setUser({ name, token });
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('userName');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
