// src/App.tsx
import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { TokenCounter } from './components/ui/TokenCounter';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './context/auth.context';

const App = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center px-4">
          <TokenCounter />
          <button
            onClick={() => useAuth().logout()}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Logout
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};

export default App;