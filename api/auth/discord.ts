// api/auth/discord.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/edge-config';

// Types
interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
}

interface UserData {
  id: string;
  username: string;
  avatar: string;
  tokenUsage: number;
  lastTokenReset: number;
}

// Edge Config setup for API route
const edgeConfig = createClient(process.env.VITE_EDGE_CONFIG_URL!);

// Helper function to generate a valid Edge Config key
function generateEdgeConfigKey(userId: string): string {
  // Prefix and replace any invalid characters in the Discord user ID with underscores
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `discord_user_${sanitizedUserId}`;
}

async function getUser(userId: string): Promise<UserData | null> {
  try {
    const userData = await edgeConfig.get<UserData>(generateEdgeConfigKey(userId));
    return userData || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

async function saveUser(userData: UserData): Promise<void> {
  try {
    const key = generateEdgeConfigKey(userData.id);
    console.log('Attempting to save user with Edge Config key:', key);

    const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.VITE_EDGE_CONFIG_ID}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          operation: 'upsert',
          key: key,
          value: userData
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Config update failed with status:', response.status);
      console.error('Edge Config error response:', errorData);
      throw new Error(`Failed to update Edge Config: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('Edge Config update successful:', result);
  } catch (error) {
    console.error('Error saving user - Full error:', error);
    console.error('Edge Config Token available:', !!process.env.VITE_EDGE_CONFIG_TOKEN);
    console.error('Edge Config ID available:', !!process.env.VITE_EDGE_CONFIG_ID);
    throw error;
  }
}

async function getDiscordUser(code: string): Promise<DiscordUser> {
  const clientId = process.env.VITE_DISCORD_CLIENT_ID;
  const clientSecret = process.env.VITE_DISCORD_CLIENT_SECRET;

  const redirectUri = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.VITE_APP_URL;

  console.log('Using redirect URI:', redirectUri);

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri!
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token response error:', errorData);
      throw new Error(`Failed to get token: ${JSON.stringify(errorData)}`);
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    return userResponse.json();
  } catch (error) {
    console.error('Discord auth error details:', error);
    throw error;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    const discordUser = await getDiscordUser(code);

    let userData = await getUser(discordUser.id);

    if (!userData) {
      userData = {
        id: discordUser.id,
        username: discordUser.username,
        avatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        tokenUsage: 0,
        lastTokenReset: Date.now()
      };

      await saveUser(userData);
    } else {
      const now = Date.now();
      const hoursSinceReset = (now - userData.lastTokenReset) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        userData.tokenUsage = 0;
        userData.lastTokenReset = now;
        await saveUser(userData);
      }
    }

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Discord auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}