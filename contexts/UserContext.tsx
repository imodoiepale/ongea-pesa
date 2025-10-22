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
    let lastEventTime = 0;
    const DEBOUNCE_MS = 500; // Ignore events within 500ms of each other
    
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email);
      
      // IGNORE INITIAL_SESSION events to prevent false logouts
      if (event === 'INITIAL_SESSION') {
        console.log('⏭️ Skipping INITIAL_SESSION event');
        return;
      }
      
      // Debounce rapid duplicate events
      const now = Date.now();
      if (now - lastEventTime < DEBOUNCE_MS && event === 'SIGNED_IN') {
        console.log('⏭️ Debouncing duplicate SIGNED_IN event');
        return;
      }
      lastEventTime = now;
      
      // Only respond to actual sign in/out events
      if (event === 'SIGNED_IN' && session?.user) {
        // User logged in - set their data
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
        console.log('✅ User logged in:', session.user.email, 'ID:', session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // User explicitly logged out - CLEAR ALL localStorage
        console.log('🚪 User logged out - clearing localStorage');
        localStorage.removeItem('ongea_pesa_user_id');
        localStorage.removeItem('ongea_pesa_user');
        
        // Create new guest user
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const guestUser: User = {
          id: guestId,
          name: 'Guest User'
        };
        setUserId(guestId);
        setUser(guestUser);
        localStorage.setItem('ongea_pesa_user_id', guestId);
        localStorage.setItem('ongea_pesa_user', JSON.stringify(guestUser));
        console.log('✅ Created new guest user:', guestId);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - update user data silently
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
        console.log('🔄 Token refreshed for:', session.user.email);
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
