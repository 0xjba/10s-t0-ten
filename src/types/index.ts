// src/types/index.ts
export type FlowState = 'WELCOME' | 'DESCRIPTION' | 'GENERATING' | 'OPTIMIZATION' | 'DEPLOYMENT' | 'WALLET' | 'COMPLETE';

export interface Message {
  id: string;
  type: 'system' | 'user' | 'contract' | 'error';
  content: string;
  metadata?: {
    tokensUsed?: number;
    charCount?: number;
    contractAddress?: string;
    optimizationAttempt?: number;
  };
}

export interface DeploymentState {
  status: 'idle' | 'deploying' | 'deployed' | 'error';
  address: string | null;
  error: string | null;
  txHash: string | null;
}

export interface AppState {
  messages: Message[];
  currentState: FlowState;
  contract: string | null;
  deployment: DeploymentState | null;
  userAddress: string | null;
  optimizations: {
    attempts: number;
    remaining: number;
    history: Array<{
      description: string;
      result: string;
    }>;
  };
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}