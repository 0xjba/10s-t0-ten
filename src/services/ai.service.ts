// src/services/ai.service.ts
import { getEnvConfig } from '../config/env';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  code: string;
  explanation: string;
  tokensUsed: number;
}

export class AIService {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions';
  
  constructor() {
    const config = getEnvConfig();
    this.apiKey = config.OPENROUTER_API_KEY;
  }

// src/services/ai.service.ts
// src/services/ai.service.ts
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

    // Try to extract code and explanation using both formats
    let code, explanation;

    // Try XML format first
    const xmlCodeMatch = content.match(/<CONTRACT>([\s\S]*?)<\/CONTRACT>/);
    const xmlExplanationMatch = content.match(/<EXPLANATION>([\s\S]*?)<\/EXPLANATION>/);

    if (xmlCodeMatch && xmlExplanationMatch) {
      code = xmlCodeMatch[1].trim();
      explanation = xmlExplanationMatch[1].trim();
    } else {
      // Try markdown format
      const markdownCodeMatch = content.match(/```solidity\n([\s\S]*?)```/);
      const documentationMatch = content.match(/\*\*Documentation:\*\*([\s\S]*$)/);

      if (!markdownCodeMatch || !documentationMatch) {
        console.error('Response content:', content);
        throw new Error('Invalid response format from AI');
      }

      code = markdownCodeMatch[1].trim();
      explanation = documentationMatch[1].trim();
    }

    return {
      code,
      explanation,
      tokensUsed: data.usage.total_tokens
    };
  } catch (error) {
    console.error('AI Service Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to communicate with AI service');
  }
}

async generateContract(description: string): Promise<AIResponse> {
  const systemPrompt = `You are a specialized smart contract generator for TEN Network.
Follow these exact privacy and security patterns:

1. State Privacy Implementation:
 - Use 'private' keyword for sensitive variables
 - Variables will not be accessible via getStorageAt
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
 - Include a private 'owner' state variable initialized to deployer address
 - Include events for ownership changes
 - Implement the following ownership functions:
   * transferOwnership(address newOwner) - transfer to new owner
   * owner() - public view function to get current owner

5. Random Number Generation (Only if needed):
 - Use block.difficulty for secure RNG when randomness is required (handled by TEEs)
 - No need for external oracles or VRF

Example ownership implementation to include in EVERY contract:
\`\`\`solidity
address private owner = msg.sender;  // Initialize to deployer
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  
function owner() public view returns (address) {
  return owner;
}
  
function transferOwnership(address newOwner) public {
  require(msg.sender == owner, "Not the owner");
  require(newOwner != address(0), "New owner is zero address");
  emit OwnershipTransferred(owner, newOwner);
  owner = newOwner;
}
\`\`\`

Ensure EVERY contract you generate includes this ownership functionality.

Format your response exactly like this:

\`\`\`solidity
// Your contract code here with ownership implementation included
\`\`\`

**Documentation:**
Your explanation here, including details about the ownership functionality`;

  const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a smart contract based on this description: ${description}` }
  ];

  return this.makeRequest(messages);
}

  async optimizeContract(currentCode: string, optimization: string): Promise<AIResponse> {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a smart contract optimization expert for TEN Network. Optimize the contract while maintaining privacy and security features.'
      },
      {
        role: 'user',
        content: `Current contract:\n${currentCode}\n\nOptimization request: ${optimization}`
      }
    ];

    return this.makeRequest(messages);
  }
}

export const aiService = new AIService();