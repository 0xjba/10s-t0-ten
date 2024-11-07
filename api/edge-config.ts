// src/services/edge-config.service.ts
import { createClient } from '@vercel/edge-config';
import type { UserData, TokenStatus } from '../src/types/auth.types';

const MAX_TOKENS = 17500;

export class EdgeConfigService {
    private client;
  
    constructor() {
      // Check if we have the required environment variables
      if (!import.meta.env.VITE_EDGE_CONFIG_URL) {
        console.error('Missing Edge Config URL');
        // Fallback to localStorage in development
        this.client = null;
      } else {
        this.client = createClient(import.meta.env.VITE_EDGE_CONFIG_URL);
      }
    }
  
    async getUser(userId: string): Promise<UserData | null> {
      try {
        if (!this.client) {
          // Fallback to localStorage in development
          const storedData = localStorage.getItem(`user:${userId}`);
          return storedData ? JSON.parse(storedData) : null;
        }
        
        const userData = await this.client.get<UserData>(`user:${userId}`);
        return userData || null;
      } catch (error) {
        console.error('Error getting user:', error);
        return null;
      }
    }
  
    async saveUser(userData: UserData): Promise<void> {
      try {
        if (!this.client) {
          // Fallback to localStorage in development
          localStorage.setItem(`user:${userData.id}`, JSON.stringify(userData));
          return;
        }
  
        const response = await fetch('/api/edge-config', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key: `user:${userData.id}`,
            value: userData
          })
        });
  
        if (!response.ok) {
          throw new Error('Failed to save user data');
        }
      } catch (error) {
        console.error('Error saving user:', error);
        throw error;
      }
    }

  async checkTokens(userId: string, requiredTokens: number): Promise<TokenStatus> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = Date.now();
    const hoursSinceReset = (now - user.lastTokenReset) / (1000 * 60 * 60);

    // Reset tokens if 24 hours have passed
    if (hoursSinceReset >= 24) {
      user.tokenUsage = 0;
      user.lastTokenReset = now;
      await this.saveUser(user);
    }

    const remainingTokens = MAX_TOKENS - user.tokenUsage;

    return {
      canUse: remainingTokens >= requiredTokens,
      remainingTokens,
      nextResetTime: user.lastTokenReset + (24 * 60 * 60 * 1000)
    };
  }

  async updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = Date.now();
    const hoursSinceReset = (now - user.lastTokenReset) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      user.tokenUsage = tokensUsed;
      user.lastTokenReset = now;
    } else {
      user.tokenUsage += tokensUsed;
    }

    await this.saveUser(user);
  }
}

// Create and export instance
export const edgeConfigService = new EdgeConfigService();