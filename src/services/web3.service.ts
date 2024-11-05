// src/services/web3.service.ts
import { ethers } from 'ethers';
import { getEnvConfig } from '../config/env';

interface DeploymentResult {
  address: string;
  transactionHash: string;
  blockNumber: number;
}

interface CompilationResult {
  abi: any[];
  bytecode: string;
}

export class Web3Service {
  private provider: ethers.providers.JsonRpcProvider;
  private deployerWallet: ethers.Wallet;
  private compilerUrl: string;
  
  constructor() {
    const config = getEnvConfig();
    this.provider = new ethers.providers.JsonRpcProvider(config.TEN_RPC_URL);
    this.deployerWallet = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, this.provider);
    this.compilerUrl = config.COMPILER_URL;
  }

  private async compileContract(sourceCode: string): Promise<CompilationResult> {
    try {
        console.log('Sending compilation request to:', this.compilerUrl);
        console.log('Source code:', sourceCode);
        
        const response = await fetch(this.compilerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sourceCode })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Compilation failed with status:', response.status);
            console.error('Error response:', errorText);
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || 'Compilation failed');
            } catch (e) {
                throw new Error(`Compilation failed: ${errorText}`);
            }
        }

        const result = await response.json();
        console.log('Compilation successful, result:', result);
        return result;
    } catch (error) {
        console.error('Compilation error:', error);
        throw error;
    }
}

  public validateAddress(address: string): boolean {
    try {
      return ethers.utils.isAddress(address);
    } catch {
      return false;
    }
  }

  public async deployContract(sourceCode: string): Promise<DeploymentResult> {
    try {
      console.log('Compiling contract...');
      const { abi, bytecode } = await this.compileContract(sourceCode);

      console.log('Creating contract factory...');
      const factory = new ethers.ContractFactory(
        abi,
        bytecode,
        this.deployerWallet
      );

      console.log('Deploying contract...');
      const contract = await factory.deploy();
      console.log('Waiting for deployment confirmation...');
      const receipt = await contract.deployTransaction.wait();

      console.log('Contract deployed successfully:', contract.address);
      return {
        address: contract.address,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Deployment failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to deploy contract');
    }
  }

  public async estimateGas(sourceCode: string): Promise<string> {
    try {
      const { abi, bytecode } = await this.compileContract(sourceCode);
      
      const factory = new ethers.ContractFactory(
        abi,
        bytecode,
        this.deployerWallet
      );

      const deploymentTx = factory.getDeployTransaction();
      const estimatedGas = await this.provider.estimateGas(deploymentTx);
      const gasPrice = await this.provider.getGasPrice();

      const estimatedCost = estimatedGas.mul(gasPrice);
      return ethers.utils.formatEther(estimatedCost);
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw new Error('Failed to estimate deployment cost');
    }
  }

  public async transferOwnership(
    contractAddress: string,
    newOwner: string
  ): Promise<void> {
    try {
      if (!this.validateAddress(newOwner)) {
        throw new Error('Invalid address format');
      }

      const abi = [
        'function transferOwnership(address newOwner) public',
        'function owner() public view returns (address)'
      ];

      const contract = new ethers.Contract(
        contractAddress,
        abi,
        this.deployerWallet
      );

      // Verify current ownership
      const currentOwner = await contract.owner();
      if (currentOwner.toLowerCase() !== this.deployerWallet.address.toLowerCase()) {
        throw new Error('Current wallet is not the contract owner');
      }

      console.log('Transferring ownership...');
      const tx = await contract.transferOwnership(newOwner);
      await tx.wait();
      console.log('Ownership transferred successfully');

    } catch (error) {
      console.error('Ownership transfer failed:', error);
      throw new Error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async checkBalance(): Promise<string> {
    try {
      const balance = await this.deployerWallet.getBalance();
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Balance check failed:', error);
      throw new Error('Failed to check wallet balance');
    }
  }

  public async getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    ensAddress?: string | null;
  }> {
    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name,
        ensAddress: network.ensAddress
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw new Error('Failed to get network information');
    }
  }

  // Helper method to check if deployment wallet is ready
  public async isWalletReady(): Promise<boolean> {
    try {
      const balance = await this.checkBalance();
      const network = await this.getNetworkInfo();
      return parseFloat(balance) > 0 && network.chainId === 443; // TEN Network
    } catch (error) {
      console.error('Wallet readiness check failed:', error);
      return false;
    }
  }
}

export const web3Service = new Web3Service();