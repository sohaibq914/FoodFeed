"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<any>;
  signIn: (login: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('foodfeed_user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          const response = await fetch('http://localhost:5000/verify-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user: userData }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.valid) {
            setUser(data.user);
          } else {
            localStorage.removeItem('foodfeed_user');
          }
        }
      } catch (error) {
        console.error('Error verifying session:', error);
        localStorage.removeItem('foodfeed_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('foodfeed_user', JSON.stringify(data.user));
        setUser(data.user);
        router.push('/dashboard');
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: 'Network error' } };
    }
  };

  const signIn = async (login: string, password: string) => {
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('foodfeed_user', JSON.stringify(data.user));
        setUser(data.user);
        router.push('/dashboard');
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: 'Network error' } };
    }
  };

  const signOut = async () => {
    try {
      await fetch('http://localhost:5000/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('foodfeed_user');
      setUser(null);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
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