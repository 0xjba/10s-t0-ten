// api/edge-config.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, EdgeConfigClient } from '@vercel/edge-config';
import type { UserData } from '../src/types';

const edgeConfig = createClient(process.env.VITE_EDGE_CONFIG_URL!);

// Helper function to generate valid Edge Config key
function generateEdgeConfigKey(userId: string): string {
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `discord_user_${sanitizedUserId}`;
}

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

        const key = generateEdgeConfigKey(decodeURIComponent(userId));
        const userData = await edgeConfig.get<UserData | null>(key);
        return res.status(200).json({ data: userData || null });
      }

      case 'PUT': {
        const { userId, tokenUsage, userData } = req.body;
        if (!userId) {
          return res.status(400).json({ error: 'Invalid request body' });
        }

        const key = generateEdgeConfigKey(userId);
        const currentData = await edgeConfig.get<UserData | null>(key);
        
        const updatedData: UserData = currentData ? {
          ...currentData,
          tokenUsage: tokenUsage !== undefined ? tokenUsage : currentData.tokenUsage,
          lastUpdated: Date.now()
        } : userData;

        const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.VITE_EDGE_CONFIG_ID}/items`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VITE_ACCESS_TOKEN}`,
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

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Edge Config update failed:', errorData);
          return res.status(500).json({ error: 'Failed to update Edge Config' });
        }

        return res.status(200).json({ data: updatedData });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Edge Config operation failed:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}