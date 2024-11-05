// src/config/env.ts
interface EnvConfig {
    OPENROUTER_API_KEY: string;
    TEN_RPC_URL: string;
    DEPLOYER_PRIVATE_KEY: string;
    TEN_NETWORK_ID: number;
    COMPILER_URL: string;
  }
  
  export const getEnvConfig = (): EnvConfig => {
    const required = [
      'VITE_OPENROUTER_API_KEY',
      'VITE_TEN_RPC_URL',
      'VITE_DEPLOYER_PRIVATE_KEY',
      'VITE_TEN_NETWORK_ID'
    ];
  
    const missing = required.filter(key => !import.meta.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    if (!import.meta.env.VITE_COMPILER_URL) {
      throw new Error('Missing compiler URL');
    }
  
    return {
      OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY,
      TEN_RPC_URL: import.meta.env.VITE_TEN_RPC_URL,
      DEPLOYER_PRIVATE_KEY: import.meta.env.VITE_DEPLOYER_PRIVATE_KEY,
      TEN_NETWORK_ID: parseInt(import.meta.env.VITE_TEN_NETWORK_ID),
      COMPILER_URL: import.meta.env.VITE_COMPILER_URL,
    };
  };