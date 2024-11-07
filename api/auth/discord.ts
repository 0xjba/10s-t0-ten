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

async function getUser(userId: string): Promise<UserData | null> {
  try {
    const userData = await edgeConfig.get<UserData>(`user:${userId}`);
    return userData || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

async function saveUser(userData: UserData): Promise<void> {
  try {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.VITE_EDGE_CONFIG_ID}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_EDGE_CONFIG_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          operation: 'upsert',
          key: `user:${userData.id}`,
          value: userData
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update Edge Config');
    }
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

// api/auth/discord.ts
// Update the getDiscordUser function

async function getDiscordUser(code: string): Promise<DiscordUser> {
    const clientId = process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.VITE_DISCORD_CLIENT_SECRET;
    
    // Use the same URL as in the auth request
    const redirectUri = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.VITE_APP_URL;
  
    console.log('Using redirect URI:', redirectUri); // For debugging
  
    try {
      // Exchange code for token
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
  
      // Get user info using the token
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

    // Get user info from Discord
    const discordUser = await getDiscordUser(code);

    // Check if user exists in Edge Config
    let userData = await getUser(discordUser.id);

    if (!userData) {
      // Create new user
      userData = {
        id: discordUser.id,
        username: discordUser.username,
        avatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        tokenUsage: 0,
        lastTokenReset: Date.now()
      };

      // Save new user
      await saveUser(userData);
    } else {
      // Check if 24 hours have passed since last reset
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