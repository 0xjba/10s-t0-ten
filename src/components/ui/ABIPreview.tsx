// src/components/ui/ABIPreview.tsx
import React, { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';
import { Button } from './Button';

interface ABIPreviewProps {
  abi: string;
}

export const ABIPreview: React.FC<ABIPreviewProps> = ({ abi }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(abi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy ABI:', error);
    }
  };

  return (
    <div className="mt-4 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center">
          <Code className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-medium text-gray-900">Contract ABI</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="flex items-center"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy ABI
            </>
          )}
        </Button>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <pre className="p-4 text-sm bg-gray-50 font-mono">
          <code>{JSON.stringify(JSON.parse(abi), null, 2)}</code>
        </pre>
      </div>
    </div>
  );
};