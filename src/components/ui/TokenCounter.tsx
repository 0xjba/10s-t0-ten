// src/components/ui/TokenCounter.tsx
import React from 'react';
import { useAppState } from '../../context/app.context';

const TOKEN_LIMITS = {
  TOTAL_MAX: 17500,
  BREAKDOWN: {
    INITIAL_GENERATION: 7000,
    RETRY: 3000,
    OPTIMIZATION: 2500, // per optimization
  }
};

export const TokenCounter = () => {
  const { state } = useAppState();
  const { total } = state.tokenUsage;
  const maxTokens = TOKEN_LIMITS.TOTAL_MAX;
  
  // Calculate percentage used
  const percentageUsed = (total / maxTokens) * 100;
  
  // Determine color based on usage
  const getProgressColor = () => {
    if (percentageUsed >= 90) return 'bg-red-600';
    if (percentageUsed >= 75) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Token Usage</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {total.toLocaleString()} / {maxTokens.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">
            ({Math.round(percentageUsed)}%)
          </span>
        </div>
      </div>
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`${getProgressColor()} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
        />
      </div>
      {percentageUsed >= 75 && (
        <p className="text-xs text-gray-500 mt-1">
          {percentageUsed >= 90 
            ? "⚠️ Approaching token limit. Some features may be restricted."
            : "Note: Nearing token limit"}
        </p>
      )}
    </div>
  );
};