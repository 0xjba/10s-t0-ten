// src/components/WalletAddressInput.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Alert, AlertDescription } from './ui/Alert';
import { Wallet, Loader2 } from 'lucide-react';
import { useAppState } from '../context/app.context';
import { web3Service } from '../services/web3.service';

export const WalletAddressInput: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleAddressSubmit = async () => {
    if (!web3Service.validateAddress(address)) {
      setError('Please enter a valid wallet address');
      return;
    }

    setError(null);
    setIsDeploying(true);

    try {
      // Add deployment message
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: 'Deploying your contract...'
        }
      });

      // Deploy contract
      const deploymentResult = await web3Service.deployContract(state.contract!);
      
      // Add deployment success message
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: `✅ Contract deployed successfully!\n\nContract Address: ${deploymentResult.address}\n\n🚀 To interact with this dApp on TEN Network:\n\n1. Visit TEN Gateway at https://testnet.ten.xyz\n2. Add TEN Network to your wallet\n3. Import your contract using the ABI below.`
        }
      });

      // Add ABI to messages
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
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: 'Transferring contract ownership...'
        }
      });

      await web3Service.transferOwnership(deploymentResult.address, address);

      // Add final success message
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'system',
          content: `🎉 Contract ownership transferred to ${address}`
        }
      });

      // Store user address
      dispatch({
        type: 'SET_USER_ADDRESS',
        payload: address
      });

      // Move to completion state
      dispatch({ type: 'SET_STATE', payload: 'COMPLETE' });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Update deployment status
      dispatch({
        type: 'SET_DEPLOYMENT_STATUS',
        payload: {
          status: 'error',
          address: null,
          error: errorMessage,
          txHash: null
        }
      });

      // Add error message to chat
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now().toString(),
          type: 'error',
          content: `Deployment failed: ${errorMessage}`
        }
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isDeploying) {
      handleAddressSubmit();
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="w-5 h-5" />
          <span>Enter Your Wallet Address</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="0x..."
              className="font-mono"
              disabled={isDeploying}
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <Button 
            onClick={handleAddressSubmit}
            disabled={!address.trim() || isDeploying}
            className="w-full"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying Contract...
              </>
            ) : (
              <>
                Deploy & Transfer Ownership
              </>
            )}
          </Button>

          <div className="text-sm space-y-2">
            {state.deployment?.status === 'deployed' && (
              <Alert>
                <AlertDescription className="font-mono break-all">
                  Contract deployed at: {state.deployment.address}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-gray-500">
              This address will become the owner of your deployed smart contract.
              Make sure to enter the correct address as this cannot be changed later.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};