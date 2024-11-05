// src/App.tsx
import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { OptimizationFlow } from './components/OptimizationFlow';
import { WalletAddressInput } from './components/WalletAddressInput';
import { ContractPreview } from './components/ContractPreview';
import { useAppState } from './context/app.context';

const App = () => {
  const { state } = useAppState();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <ChatInterface />
        </div>

        {/* Contract Preview - shown after generation */}
        {state.contract && (
          <ContractPreview 
            code={state.contract}
            contractAddress={state.deployment?.address || undefined}
            deploymentStatus={state.deployment?.status}
          />
        )}

        {/* Optimization Flow - shown in optimization state */}
        {state.currentState === 'OPTIMIZATION' && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <OptimizationFlow />
          </div>
        )}

        {/* Wallet Input - shown in wallet state */}
        {state.currentState === 'WALLET' && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <WalletAddressInput />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;