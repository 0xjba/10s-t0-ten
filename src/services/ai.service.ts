import { getEnvConfig } from '../config/env';

// Message types for API communication
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Base interface for AI responses
export interface BaseAIResponse {
  type: 'contract' | 'message';
  tokensUsed: number;
}

// Contract-specific response
export interface ContractResponse extends BaseAIResponse {
  type: 'contract';
  code: string;
  explanation: string;
}

// Message-only response (for non-contract cases)
export interface MessageResponse extends BaseAIResponse {
  type: 'message';
  content: string;
}

// Union type for all possible responses
export type AIResponse = ContractResponse | MessageResponse;

export class AIService {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions';
  
  constructor() {
    const config = getEnvConfig();
    this.apiKey = config.OPENROUTER_API_KEY;
  }

  private async makeRequest(messages: Message[]): Promise<AIResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://ten-dapp-generator.com',
          'X-Title': 'TEN dApp Generator',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-sonnet',
          messages,
          temperature: 0.1,
          top_p: 0.2,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
          repetition_penalty: 1.2,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || 
          `API request failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      const content = data.choices[0].message.content;
      const tokensUsed = data.usage.total_tokens;

      // Try to extract code and explanation using multiple formats
      const xmlCodeMatch = content.match(/<CONTRACT>([\s\S]*?)<\/CONTRACT>/);
      const xmlExplanationMatch = content.match(/<EXPLANATION>([\s\S]*?)<\/EXPLANATION>/);
      const markdownCodeMatch = content.match(/```solidity\n([\s\S]*?)```/);
      const documentationMatch = content.match(/\*\*Documentation:\*\*([\s\S]*$)/);

      // If no contract format is found, treat it as a message response
      if (!xmlCodeMatch && !xmlExplanationMatch && !markdownCodeMatch && !documentationMatch) {
        return {
          type: 'message',
          content: this.formatMessageContent(content),
          tokensUsed
        };
      }

      // Extract contract and explanation from either format
      let code = (xmlCodeMatch?.[1] || markdownCodeMatch?.[1])?.trim();
      const explanation = (xmlExplanationMatch?.[1] || documentationMatch?.[1])?.trim();

      if (!code || !explanation) {
        return {
          type: 'message',
          content: this.formatMessageContent(content),
          tokensUsed
        };
      }

      // Clean the code - remove any documentation comments at the end
      code = code.replace(/\/\*\*[\s\S]*?\*\/\s*$/, '');

      // Validate the code contains basic required elements
      if (!this.validateContractCode(code)) {
        return {
          type: 'message',
          content: "The generated response doesn't meet our security requirements or purpose of this TEN Agent. Please modify your request to ensure it is for building a dApp and it follows security guidelines.",
          tokensUsed
        };
      }

      return {
        type: 'contract',
        code,
        explanation,
        tokensUsed
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to communicate with AI service');
    }
  }

  private formatMessageContent(content: string): string {
    // Clean up and format non-contract responses
    return content
      .replace(/```[^`]*```/g, '') // Remove code blocks
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim();
  }

  private validateContractCode(code: string): boolean {
    // Basic validation to ensure the contract has required elements
    const requiredElements = [
      'pragma solidity',
      'contract',
      'address private _owner',
      'function transferOwnership'
    ];

    return requiredElements.every(element => code.includes(element));
  }

  async generateContract(description: string): Promise<AIResponse> {
    const systemPrompt = `You are a specialized smart contract generator for TEN Network, a privacy-focused blockchain platform. 
Follow these exact privacy and security patterns:

1. State Privacy Implementation:
   - Use 'private' keyword for sensitive variables for true privacy on TEN Network
   - Variables will not be accessible via getStorageAt on TEN Network
   - Implement designated access functions with proper controls
   - Use explicit access modifiers

2. Event Privacy Implementation:
   - Use indexed address parameters for private events
   - Events without address parameters will be public
   - Create private notification channels using indexed addresses

3. Security Requirements:
   - Always use 'private' for sensitive data
   - Implement access control for getters
   - Consider function parameter visibility
   - Use indexed parameters for private events
   - Design functions to minimize leaked information

4. Ownership Management (REQUIRED for ALL contracts):
   - Include these exact ownership elements at the start of the contract:
     \`\`\`solidity
     // Ownership
     address private _owner = msg.sender;
     event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
     function owner() public view returns (address) {
         return _owner;
     }
    
     function transferOwnership(address newOwner) public {
         require(msg.sender == _owner, "Not the owner");
         require(newOwner != address(0), "New owner is zero address");
         emit OwnershipTransferred(_owner, newOwner);
         _owner = newOwner;
     }
     \`\`\`

IMPORTANT CONTEXT:
- This contract will be deployed on TEN Network, not Ethereum or other blockchains
- Take advantage of TEN Network's native privacy features
- All references in explanations should mention TEN Network specifically
- Use block.difficulty for secure RNG when needed (handled by TEEs on TEN Network)
- Do not use placeholder functions, logic or TODOs
- Implement all functions completely
- Do not leave any functionality incomplete
- Ensure all functions have proper implementation
- No comments indicating future implementation needed

Format your response EXACTLY like this:

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContractName {
    // Ownership
    address private _owner = msg.sender;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    function owner() public view returns (address) {
        return _owner;
    }
    
    function transferOwnership(address newOwner) public {
        require(msg.sender == _owner, "Not the owner");
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    // Your complete, implemented contract code here...
}
\`\`\`

**Documentation:**
[Your explanation here]`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a smart contract based on this description: ${description}` }
    ];

    return this.makeRequest(messages);
  }

async optimizeContract(currentCode: string, optimization: string): Promise<AIResponse> {
  const systemPrompt = `You are a smart contract optimization expert for TEN Network. Your task is to return an EXACT, COMPLETE smart contract with the requested optimizations applied.

CRITICAL: 
- Take the existing contract code
- Apply the requested optimizations
- Return the ENTIRE contract with ALL functions and logic
- Do not use placeholder functions, logic or TODOs
- Implement all functions completely
- Do not leave any functionality incomplete
- Ensure all functions have proper implementation
- No comments indicating future implementation needed
- Include every single function, both existing and new
- Do not modify the ownership code at the start


Preserve this exact ownership code at the start:
\`\`\`solidity
// Ownership
address private _owner = msg.sender;
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

function owner() public view returns (address) {
    return _owner;
}

function transferOwnership(address newOwner) public {
    require(msg.sender == _owner, "Not the owner");
    require(newOwner != address(0), "New owner is zero address");
    emit OwnershipTransferred(_owner, newOwner);
    _owner = newOwner;
}
\`\`\`

Format your entire response exactly like this:

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractName {
    // First: The exact ownership code shown above
    // Then: ALL the contract code with optimizations applied
    // Include EVERY function and feature
}
\`\`\`

**Documentation:**
1. Optimization Changes Made:
   - [List each significant change made]
   - [Explain the impact of each change]

2. Privacy & Security Impact:
   - [Explain how the changes affect privacy]
   - [Describe any security considerations]

3. Implementation Notes:
   - [Any important technical details]
   - [Integration considerations]`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Current contract:\n${currentCode}\n\nOptimization request: ${optimization}`
    }
  ];

  return this.makeRequest(messages);
}

  // Helper method to estimate tokens from text
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

export const aiService = new AIService();