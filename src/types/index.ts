// src/types/index.ts
export type FlowState = 'WELCOME' | 'DESCRIPTION' | 'GENERATING' | 'OPTIMIZATION' | 'DEPLOYMENT' | 'WALLET' | 'COMPLETE';

export type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_STATE'; payload: FlowState }
  | { type: 'SET_CONTRACT'; payload: string }
  | { type: 'SET_USER_ADDRESS'; payload: string }
  | { type: 'SET_DEPLOYMENT_STATUS'; payload: DeploymentState }
  | { type: 'ADD_OPTIMIZATION'; payload: { description: string; result: string } }
  | { type: 'UPDATE_TOKEN_USAGE'; payload: { tokensUsed: number } }
  | { type: 'RESET_STATE' };

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
    abi?: string;
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
      total: number;
    };
  }