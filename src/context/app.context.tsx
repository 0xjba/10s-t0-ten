// src/context/app.context.tsx
import React, { createContext, useContext, useReducer } from 'react';
import { AppState, FlowState, Message } from '../types';

type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_STATE'; payload: FlowState }
  | { type: 'SET_CONTRACT'; payload: string }
  | { type: 'SET_USER_ADDRESS'; payload: string }
  | { type: 'SET_DEPLOYMENT_STATUS'; payload: AppState['deployment'] }
  | { type: 'ADD_OPTIMIZATION'; payload: { description: string; result: string } }
  | { type: 'UPDATE_TOKEN_USAGE'; payload: { input: number; output: number } }
  | { type: 'RESET_STATE' };

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
    input: 0,
    output: 0,
    total: 0,
  },
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
          input: state.tokenUsage.input + action.payload.input,
          output: state.tokenUsage.output + action.payload.output,
          total: state.tokenUsage.total + action.payload.input + action.payload.output,
        },
      };
    case 'RESET_STATE':
      return initialState;
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
    console.log('App State:', state);
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