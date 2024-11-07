export interface DiscordUser {
    id: string;
    username: string;
    avatar: string;
  }
  
  export interface UserData {
    id: string;
    username: string;
    avatar: string;
    tokenUsage: number;
    lastTokenReset: number;
  }
  
  export interface TokenStatus {
    canUse: boolean;
    remainingTokens: number;
    nextResetTime: number;
  }