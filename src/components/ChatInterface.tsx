// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Send } from 'lucide-react';
import { useAppState } from '../context/app.context';
import { aiService } from '../services/ai.service';

export const ChatInterface: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now().toString(),
        type: 'user',
        content: input.trim(),
        metadata: { charCount: input.length }
      }
    });

    // Add "typing" indicator
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: 'typing',
        type: 'system',
        content: '✨ Generating your smart contract...'
      }
    });

    setIsLoading(true);

    try {
      // Call AI service
      const result = await aiService.generateContract(input);
      
      // Remove typing indicator
      const updatedMessages = state.messages.filter(m => m.id !== 'typing');
      dispatch({
        type: 'SET_MESSAGES',
        payload: updatedMessages
      });

      // Add success message
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Contract generated successfully! Here are the key features:\n\n${result.explanation}\n\nPlease review the contract below and choose whether to deploy it or optimize it further.`
        }
      });

      // Set contract code
      dispatch({ type: 'SET_CONTRACT', payload: result.code });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Remove typing indicator
      const updatedMessages = state.messages.filter(m => m.id !== 'typing');
      dispatch({
        type: 'SET_MESSAGES',
        payload: updatedMessages
      });

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'error',
          content: `❌ Error: ${errorMessage}\n\nPlease try again or try rephrasing your request.`
        }
      });
    } finally {
      setInput('');
      setIsLoading(false);
    }
  };

  const handleContractAction = (action: 'deploy' | 'optimize') => {
    if (action === 'deploy') {
      dispatch({ type: 'SET_STATE', payload: 'WALLET' });
    } else {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: 'Please describe what optimization you would like to make to the contract.'
        }
      });
      dispatch({ type: 'SET_STATE', payload: 'OPTIMIZATION' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      {/* Messages Area */}
      <div className="h-[400px] overflow-y-auto p-4">
        <div className="space-y-4">
          {state.messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-50 ml-auto max-w-[80%] border border-blue-100' 
                  : message.type === 'error'
                  ? 'bg-red-50 max-w-[80%] border border-red-100'
                  : 'bg-gray-50 max-w-[80%] border border-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.metadata?.tokensUsed && (
                <span className="text-xs text-gray-500 mt-2 block">
                  Tokens used: {message.metadata.tokensUsed}
                </span>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Action Buttons or Input Area */}
      <div className="border-t border-gray-200 p-4">
        {state.contract && state.currentState === 'DESCRIPTION' ? (
          // Show options after contract generation
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Your contract has been generated. What would you like to do next?
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => handleContractAction('deploy')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">✨</span>
                  Good! Deploy the Contract
                </div>
              </Button>
              <Button 
                onClick={() => handleContractAction('optimize')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">🔧</span>
                  No! Need Further Optimization
                </div>
              </Button>
            </div>
          </div>
        ) : state.currentState !== 'OPTIMIZATION' || 
           (state.currentState === 'OPTIMIZATION' && state.optimizations.remaining > 0) ? (
          // Show input field when in description state or optimization state with remaining attempts
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= 1000) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyPress}
              placeholder={isLoading ? 'Please wait...' : 'Describe your dApp idea in detail...'}
              disabled={isLoading}
              className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
            />
            <div className="absolute bottom-4 right-4 flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {input.length}/1000
              </span>
              <Button 
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </div>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};