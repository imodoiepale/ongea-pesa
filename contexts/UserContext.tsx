"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
}

interface UserContextType {
  userId: string | null;
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email,
            phone: session.user.phone,
            name: session.user.user_metadata?.name
          };
          setUserId(session.user.id);
          setUser(userData);
          
          // Store in localStorage for quick access
          localStorage.setItem('ongea_pesa_user_id', session.user.id);
          localStorage.setItem('ongea_pesa_user', JSON.stringify(userData));
        } else {
          // Check localStorage as fallback (for demo purposes)
          const storedUserId = localStorage.getItem('ongea_pesa_user_id');
          const storedUser = localStorage.getItem('ongea_pesa_user');
          
          if (storedUserId && storedUser) {
            setUserId(storedUserId);
            setUser(JSON.parse(storedUser));
          } else {
            // For demo: create a temporary guest user ID
            const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const guestUser: User = {
              id: guestId,
              name: 'Guest User'
            };
            setUserId(guestId);
            setUser(guestUser);
            localStorage.setItem('ongea_pesa_user_id', guestId);
            localStorage.setItem('ongea_pesa_user', JSON.stringify(guestUser));
            console.log('Created guest user ID:', guestId);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        
        // Fallback to guest user
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const guestUser: User = {
          id: guestId,
          name: 'Guest User'
        };
        setUserId(guestId);
        setUser(guestUser);
        localStorage.setItem('ongea_pesa_user_id', guestId);
        localStorage.setItem('ongea_pesa_user', JSON.stringify(guestUser));
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email,
          phone: session.user.phone,
          name: session.user.user_metadata?.name
        };
        setUserId(session.user.id);
        setUser(userData);
        localStorage.setItem('ongea_pesa_user_id', session.user.id);
        localStorage.setItem('ongea_pesa_user', JSON.stringify(userData));
      } else {
        // Keep guest user on logout for demo purposes
        const storedUserId = localStorage.getItem('ongea_pesa_user_id');
        if (!storedUserId || !storedUserId.startsWith('guest_')) {
          const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const guestUser: User = {
            id: guestId,
            name: 'Guest User'
          };
          setUserId(guestId);
          setUser(guestUser);
          localStorage.setItem('ongea_pesa_user_id', guestId);
          localStorage.setItem('ongea_pesa_user', JSON.stringify(guestUser));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ userId, user, isLoading, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
