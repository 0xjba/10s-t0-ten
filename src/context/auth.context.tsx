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
    const redirectUri = window.location.origin;

    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('discord_user');
  };

  const checkTokens = async (requiredTokens: number): Promise<TokenStatus> => {
    if (!user) throw new Error('Not authenticated');
    return edgeConfigService.checkTokens(user.id, requiredTokens);
  };

  const updateTokenUsage = async (tokensUsed: number): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    await edgeConfigService.updateTokenUsage(user.id, tokensUsed);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          // Add origin to ensure correct redirect URI is used
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

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          // Check for existing session
          const savedUser = localStorage.getItem('discord_user');
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            const latestData = await edgeConfigService.getUser(userData.id);
            if (latestData) {
              setUser(latestData);
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