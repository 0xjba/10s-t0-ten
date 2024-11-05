// src/components/ui/ContractPreview.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Copy, Check, ChevronDown, ChevronUp, Code } from 'lucide-react';

interface ContractPreviewProps {
  code: string;
  showDiff?: boolean;
  previousCode?: string;
  contractAddress?: string | null;
  deploymentStatus?: 'idle' | 'deploying' | 'deployed' | 'error';
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({
  code,
  contractAddress,
  deploymentStatus = 'idle'
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy';
      console.error('Failed to copy code:', errorMessage);
    }
  };

  return (
    <div className="mt-6 mb-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center">
          <Code className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-medium text-gray-900">Smart Contract Preview</h3>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 mr-1" />
            ) : (
              <ChevronDown className="w-4 h-4 mr-1" />
            )}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px]' : 'max-h-[300px]'
        }`}
      >
        <div className="relative">
          <pre className="p-4 overflow-auto text-sm bg-gray-50 font-mono">
            <code className="language-solidity">{code}</code>
          </pre>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
          )}
        </div>
      </div>

      {contractAddress && (
        <div className="border-t border-gray-200 p-4 bg-green-50">
          <p className="text-sm text-green-700 font-mono break-all">
            Deployed at: {contractAddress}
          </p>
        </div>
      )}
    </div>
  );
};