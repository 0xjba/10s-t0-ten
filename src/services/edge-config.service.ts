// src/services/edge-config.service.ts
import { createClient } from '@vercel/edge-config';
import { UserData, TokenStatus } from '../../lib/types';

const MAX_TOKENS = 17500;

export class EdgeConfigService {
    private client;
  
    constructor() {
      if (!process.env.EDGE_CONFIG_URL) {
        console.error('Missing Edge Config URL');
        this.client = null;
      } else {
        this.client = createClient(process.env.EDGE_CONFIG_URL);
      }
    }
  
    async getUser(userId: string): Promise<UserData | null> {
      try {
        if (!this.client) {
          console.error('Edge Config client not initialized');
          return null;
        }
        
        const userData = await this.client.get(`user:${userId}`) as UserData;
        return userData || null;
      } catch (error) {
        console.error('Error getting user:', error);
        return null;
      }
    }
  
    async saveUser(userData: UserData): Promise<void> {
      try {
        if (!process.env.EDGE_CONFIG_TOKEN) {
          console.error('Missing Edge Config Token');
          return;
        }

        const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.EDGE_CONFIG_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                operation: 'upsert',
                key: `user:${userData.id}`,
                value: userData
              }
            ]
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