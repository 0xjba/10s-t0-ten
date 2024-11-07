import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'PATCH') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { key, value } = request.body;
    const configId = process.env.VITE_EDGE_CONFIG_ID;
    const token = process.env.VITE_EDGE_CONFIG_TOKEN;

    const vercelResponse = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          operation: 'upsert',
          key,
          value
        }]
      })
    });

    if (!vercelResponse.ok) {
      throw new Error('Failed to update Edge Config');
    }

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Edge Config error:', error);
    return response.status(500).json({ error: 'Failed to update Edge Config' });
  }
}