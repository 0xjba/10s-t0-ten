// src/components/ui/ContractPill.tsx
import React, { useState } from 'react';
import { Code, ChevronDown, ChevronUp } from 'lucide-react';
import { ContractPreview } from './ContractPreview';

interface ContractPillProps {
  code: string;
  contractAddress?: string | null;
  deploymentStatus?: 'idle' | 'deploying' | 'deployed' | 'error';
  isOptimized?: boolean;
}

export const ContractPill: React.FC<ContractPillProps> = ({
  code,
  contractAddress,
  deploymentStatus = 'idle',
  isOptimized = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-colors"
      >
        <Code className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">
          {isExpanded ? 'Hide Smart Contract' : 'View Smart Contract'}
          {isOptimized && ' (Optimized)'}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-2" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-2">
          <ContractPreview 
            code={code}
            contractAddress={contractAddress}
            deploymentStatus={deploymentStatus}
          />
        </div>
      )}
    </div>
  );
};