// src/services/edge-config.service.ts
import type { UserData, TokenStatus } from '../types';

export class EdgeConfigService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = '/api/edge-config';
  }

  async getUser(userId: string): Promise<UserData | null> {
    try {
      const response = await fetch(`${this.apiUrl}?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          tokenUsage: tokensUsed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update token usage');
      }
    } catch (error) {
      console.error('Error updating token usage:', error);
      throw error;
    }
  }

  async checkTokens(userId: string, requiredTokens: number): Promise<TokenStatus> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const MAX_TOKENS = 17500;
    const now = Date.now();
    const hoursSinceReset = (now - user.lastTokenReset) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      // Reset tokens if 24 hours have passed
      await this.updateTokenUsage(userId, 0);
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
      nextResetTime: user.lastTokenReset + (24 * 60 * 60 * 1000)
    };
  }
}

export const edgeConfigService = new EdgeConfigService();