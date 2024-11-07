import { edgeConfigService } from '@/services/edge-config.service';
import type { DiscordUser, UserData } from '@/types/auth.types';

async function getDiscordUser(code: string): Promise<DiscordUser> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000'
  : import.meta.env.VITE_REDIRECT_URI;

  // Exchange code for token
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get token');
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
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    // Get user info from Discord
    const discordUser = await getDiscordUser(code);

    // Check if user exists in Edge Config
    let userData = await edgeConfigService.getUser(discordUser.id);

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
      await edgeConfigService.saveUser(userData);
    } else {
      // Check if 24 hours have passed since last reset
      const now = Date.now();
      const hoursSinceReset = (now - userData.lastTokenReset) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        userData.tokenUsage = 0;
        userData.lastTokenReset = now;
        await edgeConfigService.saveUser(userData);
      }
    }

    return new Response(JSON.stringify(userData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Discord auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}