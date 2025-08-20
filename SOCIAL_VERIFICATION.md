# 🔐 Social Media Verification System

## Overview
Automated account verification system that checks if users meet social media requirements:
- ✅ Follow **JoeDom_** on Twitch
- ✅ Follow **oxsaudio** on Instagram  
- ✅ Be a member of the Discord server

## Setup Instructions

### 1. Install Dependencies
```bash
npm install node-fetch
```

### 2. Configure Social Media APIs
Run the setup script:
```bash
node setup-social-verification.js
```

Or manually create/update `.env` file:
```env
# Twitch API (Required)
TWITCH_CLIENT_ID="your_twitch_client_id"
TWITCH_ACCESS_TOKEN="your_twitch_access_token"

# Instagram API (Optional)
INSTAGRAM_ACCESS_TOKEN="your_instagram_access_token"

# Discord Bot (Required)
DISCORD_BOT_TOKEN="your_discord_bot_token"
DISCORD_SERVER_ID="your_discord_server_id"
```

### 3. API Setup Instructions

#### Twitch API Setup
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Copy the **Client ID**
4. Generate a **Client Secret**
5. Get an access token from [Twitch Token Generator](https://twitchtokengenerator.com/)

#### Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the **Bot Token**
5. Invite bot to your server with "View Server Members" permission
6. Get your Discord **Server ID** (right-click server → Copy ID)

#### Instagram API Setup (Optional)
Instagram verification is complex and requires business verification. You can skip this for now.

## How It Works

### User Flow
1. User navigates to `/verify`
2. Enters their social media usernames
3. Clicks "Verify Account"
4. System checks all requirements automatically
5. If verified, user account is marked as verified

### API Verification Process
1. **Twitch**: Checks if user follows JoeDom_ channel
2. **Instagram**: Placeholder (requires business verification)
3. **Discord**: Checks if user is member of specified server

### Technical Implementation
- **API Endpoint**: `/api/auth/verify-social`
- **Verification Page**: `/verify`
- **Database**: Updates `isVerified` field and stores social usernames
- **Navigation**: Shows "🔥 Verifizieren" button for unverified users

## Files Created/Modified

### New Files
- `src/app/api/auth/verify-social/route.ts` - Verification API
- `src/app/verify/page.tsx` - Verification page
- `setup-social-verification.js` - Setup script
- `.env.example` - Environment template

### Modified Files
- `src/contexts/AuthContext.tsx` - Added token to context
- `src/components/Navigation.tsx` - Added verification link
- `prisma/schema.prisma` - Uses existing social media fields

## Testing

### With APIs Configured
1. Set up all API credentials
2. User enters real social media usernames
3. System performs actual verification

### Without APIs (Development)
1. Leave API credentials empty in `.env`
2. System skips verification (returns true)
3. Useful for local development

## Security Notes
- All API calls are server-side only
- User tokens are validated before verification
- Social media credentials are never exposed to client
- Rate limiting applies to external APIs

## Troubleshooting

### Common Issues
1. **Twitch API Errors**: Check token validity and permissions
2. **Discord API Errors**: Ensure bot has server member permissions
3. **Instagram Limitations**: Skip for now, implement later
4. **Token Errors**: Verify JWT secret matches

### Debug Mode
Add console logs to verification API for debugging:
```javascript
console.log('Verification attempt:', { userId, socialAccounts })
```

## Future Enhancements
- Email verification
- Real-time webhook notifications
- Admin override capabilities
- Bulk verification tools
- Analytics dashboard

## API Rate Limits
- **Twitch**: 800 requests per minute
- **Discord**: 50 requests per second
- **Instagram**: Very limited (business only)

## Support
For API setup assistance, check:
- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)
- [Discord API Documentation](https://discord.com/developers/docs/intro)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
