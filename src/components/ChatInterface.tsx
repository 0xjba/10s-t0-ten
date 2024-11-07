// src/components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Send, Lock, Zap, Shield, Wand2 } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Alert, AlertDescription } from './ui/Alert';
import { useAppState } from '../context/app.context';
import { aiService } from '../services/ai.service';
import { web3Service } from '../services/web3.service';
import { TokenLimits } from '../utils/tokenManagement';
import { ContractPill } from './ContractPill';

interface ContractVersion {
  code: string;
  timestamp: number;
  isOptimized: boolean;
}

interface OptimizationCategory {
  id: 'PRIVACY' | 'FUNCTIONALITY' | 'SECURITY';
  icon: React.ReactNode;
  title: string;
  description: string;
  examples: string[];
}

const categories: OptimizationCategory[] = [
  {
    id: 'PRIVACY',
    icon: <Lock className="w-5 h-5" />,
    title: 'Privacy Enhancements',
    description: 'Improve data privacy and access control',
    examples: [
      'Add private state variables',
      'Implement selective access',
      'Add private events'
    ]
  },
  {
    id: 'FUNCTIONALITY',
    icon: <Zap className="w-5 h-5" />,
    title: 'Feature Updates',
    description: 'Enhance contract capabilities',
    examples: [
      'Add new features',
      'Modify existing functions',
      'Add emergency controls'
    ]
  },
  {
    id: 'SECURITY',
    icon: <Shield className="w-5 h-5" />,
    title: 'Security Improvements',
    description: 'Strengthen contract security',
    examples: [
      'Add access controls',
      'Improve validation',
      'Add safety checks'
    ]
  }
];

export const ChatInterface: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [input, setInput] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<OptimizationCategory | null>(null);
  const [contractVersions, setContractVersions] = useState<ContractVersion[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleDeployContract = async () => {
    if (!state.contract || !walletAddress.trim()) return;

    dispatch({
      type: 'SET_DEPLOYMENT_STATUS',
      payload: {
        status: 'deploying',
        address: null,
        error: null,
        txHash: null
      }
    });

    try {
      const deploymentResult = await web3Service.deployContract(state.contract);
      
      // Add deployment success message
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Contract deployed successfully!\n\nContract Address: ${deploymentResult.address}\n\n🚀 To interact with this dApp on TEN Network:\n\n1. Visit TEN Gateway at https://testnet.ten.xyz\n2. Add TEN Network to your wallet\n3. Import your contract using the ABI below.`
        }
      });

      // Add ABI preview in chat
      if (deploymentResult.abi) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now().toString(),
            type: 'contract',
            content: JSON.stringify(JSON.parse(deploymentResult.abi), null, 2)
          }
        });
      }

      // Update deployment status
      dispatch({
        type: 'SET_DEPLOYMENT_STATUS',
        payload: {
          status: 'deployed',
          address: deploymentResult.address,
          abi: deploymentResult.abi,
          error: null,
          txHash: deploymentResult.transactionHash
        }
      });

      // Try to transfer ownership
      await web3Service.transferOwnership(deploymentResult.address, walletAddress);

      dispatch({ type: 'SET_STATE', payload: 'COMPLETE' });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'error',
          content: `Deployment failed: ${errorMessage}`
        }
      });

      dispatch({
        type: 'SET_DEPLOYMENT_STATUS',
        payload: {
          status: 'error',
          address: null,
          error: errorMessage,
          txHash: null
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    // Check token limits
    if (!TokenLimits.canMakeRequest(state.tokenUsage.total, 
      state.currentState === 'DESCRIPTION' ? 'INITIAL' : 'OPTIMIZATION')) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'error',
          content: "Token limit reached. Cannot generate more content."
        }
      });
      return;
    }

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

    // Add typing indicator
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: 'typing',
        type: 'system',
        content: '✨ Generating response...'
      }
    });

    setIsLoading(true);

    try {
      const result = state.currentState === 'DESCRIPTION'
        ? await aiService.generateContract(input)
        : await aiService.optimizeContract(state.contract!, input);
      
      // Remove typing indicator
      const updatedMessages = state.messages.filter(m => m.id !== 'typing');
      dispatch({
        type: 'SET_MESSAGES',
        payload: updatedMessages
      });

      // Update token usage
      dispatch({
        type: 'UPDATE_TOKEN_USAGE',
        payload: {
          tokensUsed: result.tokensUsed
        }
      });

      if (result.type === 'contract') {
        if (state.currentState === 'DESCRIPTION') {
          // Initial contract generation
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now().toString(),
              type: 'system',
              content: `✅ Contract generated successfully! Here are the key features:\n\n${result.explanation}\n\nPlease review the contract below and choose whether to deploy it or optimize it further.`,
              metadata: { tokensUsed: result.tokensUsed }
            }
          });
          
          setContractVersions([{
            code: result.code,
            timestamp: Date.now(),
            isOptimized: false
          }]);
          
          dispatch({ type: 'SET_CONTRACT', payload: result.code });
        } else {
          // Optimization result
          dispatch({
            type: 'ADD_OPTIMIZATION',
            payload: {
              description: input,
              result: result.code
            }
          });

          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now().toString(),
              type: 'system',
              content: `✅ Contract optimized successfully!\n\n${result.explanation}`,
              metadata: { tokensUsed: result.tokensUsed }
            }
          });

          // Add new version to history
          setContractVersions(prev => [...prev, {
            code: result.code,
            timestamp: Date.now(),
            isOptimized: true
          }]);

          dispatch({ type: 'SET_CONTRACT', payload: result.code });

          if (state.optimizations.remaining === 1) {
            dispatch({ type: 'SET_STATE', payload: 'WALLET' });
          }
          setSelectedCategory(null);
        }
      } else {
        // Handle non-contract response
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now().toString(),
            type: 'system',
            content: result.content,
            metadata: { tokensUsed: result.tokensUsed }
          }
        });
      }

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
          content: `Error: ${errorMessage}\n\nPlease try again or try rephrasing your request.`
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
          content: 'Please select an optimization category and describe the changes you would like to make to the contract.'
        }
      });
      dispatch({ type: 'SET_STATE', payload: 'OPTIMIZATION' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.currentState === 'WALLET') {
        handleDeployContract();
      } else {
        handleSubmit();
      }
    }
  };

  const renderOptimizationOptions = () => {
    if (state.currentState !== 'OPTIMIZATION') return null;

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">Select Optimization Type</h3>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {state.optimizations.remaining} attempts remaining
            </Badge>
            <Button
              onClick={() => {
                setSelectedCategory(null);
                dispatch({ type: 'SET_STATE', payload: 'DESCRIPTION' });
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: Date.now().toString(),
                    type: 'system',
                    content: 'What would you like to do with your contract?'
                  }
                });
              }}
              variant="outline"
              size="sm"
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              Exit Optimization
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className={`cursor-pointer p-4 rounded-lg border ${
                selectedCategory?.id === category.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                {category.icon}
                <span className="font-medium">{category.title}</span>
              </div>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Messages Area */}
      <div className="h-[400px] overflow-y-auto p-4">
        <div className="space-y-4">
          {state.messages.map((message) => (
            <div key={message.id}>
              <div className={`p-4 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-50 ml-auto max-w-[80%] border border-blue-100' 
                  : message.type === 'error'
                  ? 'bg-red-50 max-w-[80%] border border-red-100'
                  : message.type === 'contract'
                  ? 'bg-gray-50 max-w-full border border-gray-100 font-mono text-sm overflow-x-auto'
                  : 'bg-gray-50 max-w-[80%] border border-gray-100'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.metadata?.tokensUsed && (
                  <span className="text-xs text-gray-500 mt-2 block">
                    {message.metadata.tokensUsed.toLocaleString()} tokens
                  </span>
                )}
              </div>
              {message.type === 'system' && 
               (message.content.includes('Contract generated successfully') || 
                message.content.includes('Contract optimized successfully')) && 
                contractVersions.find(v => Math.abs(v.timestamp - parseInt(message.id)) < 1000) && (
                <ContractPill
                  code={(contractVersions.find(v => 
                    Math.abs(v.timestamp - parseInt(message.id)) < 1000
                  ) as ContractVersion).code}
                  contractAddress={state.deployment?.address}
                  deploymentStatus={state.deployment?.status}
                  isOptimized={message.content.includes('optimized')}
                />
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {renderOptimizationOptions()}
        
        {state.contract && state.currentState === 'DESCRIPTION' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              What would you like to do with your contract?
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => handleContractAction('deploy')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <div className="flex items-center justify-center">
                  <span className="mr-2">✨</span>
                  Deploy Contract
                </div>
              </Button>
              {state.optimizations.remaining > 0 && (
                <Button 
                  onClick={() => handleContractAction('optimize')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🔧</span>
                    Optimize Further
                  </div>
                </Button>
              )}
            </div>
          </div>
        ) : state.currentState === 'WALLET' ? (
          <div className="relative">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your wallet address (0x...)"
              className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <div className="absolute bottom-4 right-4 flex items-center space-x-4">
              <Button 
                onClick={handleDeployContract}
                disabled={!walletAddress.trim() || state.deployment?.status === 'deploying'}
              >
                {state.deployment?.status === 'deploying' ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deploying...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="mr-2">🚀</span>
                    Deploy & Transfer Ownership
                  </div>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => {
                const maxLength = state.currentState === 'DESCRIPTION' ? 1000 : 400;
                if (e.target.value.length <= maxLength) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyPress}
              placeholder={
                isLoading 
                  ? 'Please wait...' 
                  : state.currentState === 'DESCRIPTION'
                  ? 'Describe your dApp idea in detail...'
                  : selectedCategory
                  ? `Describe your ${selectedCategory.title.toLowerCase()} optimization request...`
                  : 'Select an optimization category above...'
              }
              disabled={isLoading || (state.currentState === 'OPTIMIZATION' && !selectedCategory)}
              className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
            />
            <div className="absolute bottom-4 right-4 flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {input.length}/{state.currentState === 'DESCRIPTION' ? 1000 : 400}
              </span>
              <Button 
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading || (state.currentState === 'OPTIMIZATION' && !selectedCategory)}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {state.currentState === 'OPTIMIZATION' ? 'Optimizing...' : 'Generating...'}
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
        )}
      </div>
    </div>
  );
};