// src/context/auth.context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserData, TokenStatus } from '../types';
import { edgeConfigService } from '../../lib/edge-config.service';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  checkTokens: (requiredTokens: number) => Promise<TokenStatus>;
  updateTokenUsage: (tokensUsed: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogin = () => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = import.meta.env.DEV 
      ? 'http://localhost:3000'
      : import.meta.env.VITE_APP_URL;
  
    // Store the current URL to redirect back after login
    sessionStorage.setItem('returnUrl', window.location.href);
    
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('discord_user');
    localStorage.removeItem('auth_timestamp');
    sessionStorage.removeItem('returnUrl');
  };

  const checkTokens = async (requiredTokens: number): Promise<TokenStatus> => {
    if (!user) throw new Error('Not authenticated');
    return edgeConfigService.checkTokens(user.id, requiredTokens);
  };

  const updateTokenUsage = async (tokensUsed: number): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // Update local user state
      const updatedUser = {
        ...user,
        tokenUsage: user.tokenUsage + tokensUsed
      };
      setUser(updatedUser);
      localStorage.setItem('discord_user', JSON.stringify(updatedUser));
      
      // Update Edge Config
      await edgeConfigService.updateTokenUsage(user.id, tokensUsed);
    } catch (error) {
      console.error('Failed to update token usage:', error);
      throw error;
    }
  };

  const validateAndRefreshSession = async (savedUser: UserData): Promise<UserData | null> => {
    try {
      // Check if the session is still valid (24 hours)
      const timestamp = localStorage.getItem('auth_timestamp');
      const now = Date.now();
      if (timestamp && now - parseInt(timestamp) < 24 * 60 * 60 * 1000) {
        // Get latest token usage from Edge Config
        const latestData = await edgeConfigService.getUser(savedUser.id);
        if (latestData) {
          // Update local storage with latest data
          localStorage.setItem('discord_user', JSON.stringify(latestData));
          return latestData;
        }
      }
      return null;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          // Handle Discord OAuth callback
          const response = await fetch('/api/auth/discord', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            },
            body: JSON.stringify({ code })
          });

          if (!response.ok) {
            throw new Error('Auth failed');
          }

          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('discord_user', JSON.stringify(userData));
          localStorage.setItem('auth_timestamp', Date.now().toString());

          // Redirect back to the original URL if available
          const returnUrl = sessionStorage.getItem('returnUrl');
          if (returnUrl) {
            sessionStorage.removeItem('returnUrl');
            window.location.href = returnUrl;
          } else {
            // Clean URL if no return URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          // Check for existing session
          const savedUserData = localStorage.getItem('discord_user');
          if (savedUserData) {
            const savedUser = JSON.parse(savedUserData);
            const validatedUser = await validateAndRefreshSession(savedUser);
            if (validatedUser) {
              setUser(validatedUser);
            } else {
              // Session expired or invalid, clear storage
              handleLogout();
            }
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login: handleLogin,
      logout: handleLogout,
      checkTokens,
      updateTokenUsage
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};