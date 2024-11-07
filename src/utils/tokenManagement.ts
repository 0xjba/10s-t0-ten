// src/utils/tokenManagement.ts
export const TokenLimits = {
    TOTAL_MAX: 17500,
    
    INITIAL_GENERATION: {
      USER_INPUT: 250,
      SYSTEM_PROMPT: 500,
      AI_OUTPUT: 6000,
      TOTAL: 7000
    },
    
    RETRY: {
      USER_INPUT: 250,
      SYSTEM_PROMPT: 500,
      AI_OUTPUT: 2000,
      TOTAL: 3000
    },
    
    OPTIMIZATION: {
      USER_INPUT: 100,
      SYSTEM_PROMPT: 300,
      AI_OUTPUT: 2000,
      TOTAL: 2500
    },
    
    // Helper functions
    canMakeRequest: (currentTotal: number, requestType: 'INITIAL' | 'RETRY' | 'OPTIMIZATION'): boolean => {
      const remainingTokens = TokenLimits.TOTAL_MAX - currentTotal;
      
      switch (requestType) {
        case 'INITIAL':
          return remainingTokens >= TokenLimits.INITIAL_GENERATION.TOTAL;
        case 'RETRY':
          return remainingTokens >= TokenLimits.RETRY.TOTAL;
        case 'OPTIMIZATION':
          return remainingTokens >= TokenLimits.OPTIMIZATION.TOTAL;
      }
    },
    
    estimateRequestTokens: (inputText: string, requestType: 'INITIAL' | 'RETRY' | 'OPTIMIZATION'): number => {
      // Rough estimate: ~4 chars per token for input text
      const inputTokens = Math.ceil(inputText.length / 4);
      
      switch (requestType) {
        case 'INITIAL':
          return inputTokens + TokenLimits.INITIAL_GENERATION.SYSTEM_PROMPT + 
                 TokenLimits.INITIAL_GENERATION.AI_OUTPUT;
        case 'RETRY':
          return inputTokens + TokenLimits.RETRY.SYSTEM_PROMPT + 
                 TokenLimits.RETRY.AI_OUTPUT;
        case 'OPTIMIZATION':
          return inputTokens + TokenLimits.OPTIMIZATION.SYSTEM_PROMPT + 
                 TokenLimits.OPTIMIZATION.AI_OUTPUT;
      }
    }
  };