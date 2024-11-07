// src/context/app.context.tsx
import React, { createContext, useContext, useReducer } from 'react';
import type { AppState, FlowState, Message, Action, DeploymentState } from '../types';

const initialState: AppState = {
  messages: [
    {
      id: 'welcome',
      type: 'system',
      content: `👋 Welcome to TEN dApp Generator! I'll help you create a privacy-focused smart contract for the TEN Network.

Please describe your dApp idea in detail. For example:
- What's the main purpose?
- What features do you need?
- What kind of data needs to be private?

I'll generate a secure smart contract based on your requirements.`
    }
  ],
  currentState: 'DESCRIPTION',
  contract: null,
  deployment: null,
  userAddress: null,
  optimizations: {
    attempts: 0,
    remaining: 3,
    history: [],
  },
  tokenUsage: {
    total: 0
  }
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
      };

    case 'SET_STATE':
      return {
        ...state,
        currentState: action.payload,
      };

    case 'SET_CONTRACT':
      return {
        ...state,
        contract: action.payload,
      };

    case 'SET_USER_ADDRESS':
      return {
        ...state,
        userAddress: action.payload,
      };

    case 'SET_DEPLOYMENT_STATUS':
      return {
        ...state,
        deployment: action.payload,
      };

    case 'ADD_OPTIMIZATION':
      return {
        ...state,
        optimizations: {
          attempts: state.optimizations.attempts + 1,
          remaining: state.optimizations.remaining - 1,
          history: [...state.optimizations.history, action.payload],
        },
      };

    case 'UPDATE_TOKEN_USAGE':
      return {
        ...state,
        tokenUsage: {
          total: state.tokenUsage.total + action.payload.tokensUsed
        },
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        messages: [
          {
            id: Date.now().toString(),
            type: 'system',
            content: initialState.messages[0].content
          }
        ]
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Optional: Log state changes during development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('App State:', state);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

// Optional: Export a function to reset the state
export function useResetState() {
  const { dispatch } = useAppState();
  return () => dispatch({ type: 'RESET_STATE' });
}

// Optional: Export a function to check if we can perform more optimizations
export function useCanOptimize() {
  const { state } = useAppState();
  return state.optimizations.remaining > 0;
}

// Optional: Export a function to get the current token usage percentage
export function useTokenUsage() {
  const { state } = useAppState();
  const maxTokens = 17500; // Our maximum token limit
  return {
    total: state.tokenUsage.total,
    percentage: (state.tokenUsage.total / maxTokens) * 100,
    remaining: maxTokens - state.tokenUsage.total
  };
}