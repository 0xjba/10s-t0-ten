// api/edge-config.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/edge-config';

interface UserData {
  id: string;
  username: string;
  avatar: string;
  tokenUsage: number;
  lastTokenReset: number;
  lastUpdated?: number;
}

const edgeConfig = createClient(process.env.VITE_EDGE_CONFIG_URL!);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET': {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
          return res.status(400).json({ error: 'userId is required' });
        }

        const userData = await edgeConfig.get<UserData | null>(`user:${userId}`);
        return res.status(200).json(userData);
      }

      case 'PUT': {
        const { userId, tokenUsage } = req.body;
        if (!userId || typeof tokenUsage !== 'number') {
          return res.status(400).json({ error: 'Invalid request body' });
        }

        // Update edge config
        const key = `user:${userId}`;
        const currentData = await edgeConfig.get<UserData | null>(key);
        
        if (!currentData) {
          return res.status(404).json({ error: 'User not found' });
        }

        const updatedData: UserData = {
          ...currentData,
          tokenUsage: currentData.tokenUsage + tokenUsage,
          lastUpdated: Date.now()
        };

        await fetch(`https://api.vercel.com/v1/edge-config/${process.env.VITE_EDGE_CONFIG_ID}/items`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VITE_EDGE_CONFIG_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: [{
              operation: 'upsert',
              key,
              value: updatedData
            }]
          })
        });

        return res.status(200).json(updatedData);
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Edge Config operation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}