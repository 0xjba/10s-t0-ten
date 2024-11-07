import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Log environment variables (don't include in production!)
    console.log('Edge Config setup:', {
      hasToken: !!process.env.VITE_EDGE_CONFIG_TOKEN,
      hasId: !!process.env.VITE_EDGE_CONFIG_ID,
      tokenFirstChars: process.env.VITE_EDGE_CONFIG_TOKEN?.substring(0, 4),
      idFirstChars: process.env.VITE_EDGE_CONFIG_ID?.substring(0, 4)
    });

    // Try a test write
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.VITE_EDGE_CONFIG_ID}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_EDGE_CONFIG_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          operation: 'upsert',
          key: 'test',
          value: { test: true }
        }]
      })
    });

    const result = await response.json();
    
    return res.status(200).json({
      success: response.ok,
      status: response.status,
      result
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ error: 'Test failed', details: error });
  }
}