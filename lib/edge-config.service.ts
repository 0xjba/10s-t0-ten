// lib/edge-config.service.ts
import { createClient } from '@vercel/edge-config';
import type { UserData, TokenStatus } from '../src/types';

const MAX_TOKENS = 17500;

export class EdgeConfigService {
  private client;
  private apiUrl: string;

  constructor() {
    this.apiUrl = '/api/edge-config';
    
    if (!import.meta.env.VITE_EDGE_CONFIG_URL) {
      console.error('Missing Edge Config URL');
      this.client = null;
    } else {
      this.client = createClient(import.meta.env.VITE_EDGE_CONFIG_URL);
    }
  }

  // Helper function to generate valid Edge Config key
  private generateEdgeConfigKey(userId: string): string {
    // Prefix and replace any invalid characters in the Discord user ID with underscores
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `discord_user_${sanitizedUserId}`;
  }

  async getUser(userId: string): Promise<UserData | null> {
    try {
      if (!this.client) {
        // Fallback to localStorage in development
        const storedData = localStorage?.getItem(`user:${userId}`);
        return storedData ? JSON.parse(storedData) : null;
      }
      
      const key = this.generateEdgeConfigKey(userId);
      const response = await fetch(`${this.apiUrl}?userId=${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonResponse = await response.json();
      return jsonResponse.data;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async saveUser(userData: UserData): Promise<void> {
    try {
      if (!this.client) {
        // Fallback to localStorage in development
        localStorage?.setItem(`user:${userData.id}`, JSON.stringify(userData));
        return;
      }

      const key = this.generateEdgeConfigKey(userData.id);
      const response = await fetch(this.apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: key,
          tokenUsage: userData.tokenUsage || 0,
          userData: userData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save user error response:', errorData);
        throw new Error(errorData.error || 'Failed to save user data');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async initializeNewUser(discordUserData: { id: string; username: string; avatar: string }): Promise<UserData> {
    const newUser: UserData = {
      id: discordUserData.id,
      username: discordUserData.username,
      avatar: discordUserData.avatar,
      tokenUsage: 0,
      lastTokenReset: Date.now(),
      lastUpdated: Date.now()
    };

    await this.saveUser(newUser);
    return newUser;
  }

  async updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    try {
      let user = await this.getUser(userId);
      
      if (!user) {
        user = {
          id: userId,
          username: '',
          avatar: '',
          tokenUsage: 0,
          lastTokenReset: Date.now(),
          lastUpdated: Date.now()
        };
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
    } catch (error) {
      console.error('Error updating token usage:', error);
      throw error;
    }
  }

  async checkTokens(userId: string, requiredTokens: number): Promise<TokenStatus> {
    try {
      const user = await this.getUser(userId);
      
      if (!user) {
        return {
          canUse: true,
          remainingTokens: MAX_TOKENS,
          nextResetTime: Date.now()
        };
      }

      const now = Date.now();
      const hoursSinceReset = (now - (user.lastTokenReset || now)) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        user.tokenUsage = 0;
        user.lastTokenReset = now;
        await this.saveUser(user);
        
        return {
          canUse: true,
          remainingTokens: MAX_TOKENS,
          nextResetTime: now
        };
      }

      const remainingTokens = MAX_TOKENS - (user.tokenUsage || 0);
      return {
        canUse: remainingTokens >= requiredTokens,
        remainingTokens,
        nextResetTime: (user.lastTokenReset || now) + (24 * 60 * 60 * 1000)
      };
    } catch (error) {
      console.error('Error checking tokens:', error);
      throw error;
    }
  }

  getTimeUntilReset(lastResetTime: number): string {
    const now = Date.now();
    const nextReset = lastResetTime + (24 * 60 * 60 * 1000);
    const timeLeft = nextReset - now;

    if (timeLeft <= 0) return 'Ready to reset';

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }
}

export const edgeConfigService = new EdgeConfigService();