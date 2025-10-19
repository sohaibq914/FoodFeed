"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  profile_picture_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<any>;
  signIn: (login: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  deactivateAccount: (password: string) => Promise<any>;
  uploadProfilePicture: (file: File) => Promise<any>;
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

          setUser(userData);
          
          // Verify session in background
          const response = await fetch('http://localhost:5001/verify-session', { //note the port number -andrew
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user: userData }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.valid) {
            // Update with fresh data from server if different
            if (JSON.stringify(data.user) !== JSON.stringify(userData)) {
              setUser(data.user);
              localStorage.setItem('foodfeed_user', JSON.stringify(data.user));
            }
          } else {
            localStorage.removeItem('foodfeed_user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error verifying session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await fetch('http://localhost:5001/register', {
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
      const response = await fetch('http://localhost:5001/login', {
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
      await fetch('http://localhost:5001/logout', {
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('http://localhost:5001/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: user?.email,
          currentPassword: currentPassword,
          newPassword: newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await signOut();
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: 'Network error occurred' } };
    }
  };

  const deactivateAccount = async (password: string) => {
    try {
      const response = await fetch('http://localhost:5001/deactivate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: user?.email,
          password: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.removeItem('foodfeed_user');
        setUser(null);
        router.push('/');
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: 'Network error occurred' } };
    }
  };

  const uploadProfilePicture = async (file: File) => {
    try {
      if (!user?.id) {
        return { error: { message: 'User not authenticated' } };
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return { error: { message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' } };
      }

      if (file.size > 5 * 1024 * 1024) {
        return { error: { message: 'File size must be less than 5MB' } };
      }

      const formData = new FormData();
      formData.append('profile_picture', file);
      formData.append('user_id', user.id);

      const response = await fetch('http://localhost:5001/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = {
          ...user,
          profile_picture_url: data.profile_picture_url
        };
        
        setUser(updatedUser);
        localStorage.setItem('foodfeed_user', JSON.stringify(updatedUser));
        
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: 'Network error occurred' } };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, changePassword, deactivateAccount, uploadProfilePicture }}>
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