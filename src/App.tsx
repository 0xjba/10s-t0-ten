import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { TokenCounter } from './components/ui/TokenCounter';
import { useAppState } from './context/app.context';

const App = () => {
  const { state } = useAppState();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <TokenCounter />
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};

export default App;