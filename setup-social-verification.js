#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const envPath = path.join(__dirname, '.env')
const envExamplePath = path.join(__dirname, '.env.example')

console.log('🔧 Social Media Verification Setup')
console.log('=====================================\n')

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupSocialVerification() {
  console.log('This script will help you set up automatic social media verification.')
  console.log('You can skip any platform by leaving the field empty.\n')

  const config = {}

  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        config[key] = value.replace(/['"]/g, '')
      }
    })
  }

  console.log('📺 TWITCH SETUP')
  console.log('Follow these steps to get Twitch API credentials:')
  console.log('1. Go to https://dev.twitch.tv/console/apps')
  console.log('2. Create a new application')
  console.log('3. Copy the Client ID and generate a Client Secret')
  console.log('4. Get an access token from https://twitchtokengenerator.com/\n')

  const twitchClientId = await question(`Twitch Client ID (current: ${config.TWITCH_CLIENT_ID || 'not set'}): `)
  const twitchAccessToken = await question(`Twitch Access Token (current: ${config.TWITCH_ACCESS_TOKEN || 'not set'}): `)

  console.log('\n📸 INSTAGRAM SETUP (Optional)')
  console.log('Instagram verification is complex and requires business verification.')
  console.log('You can skip this for now and implement later.\n')

  const instagramToken = await question(`Instagram Access Token (current: ${config.INSTAGRAM_ACCESS_TOKEN || 'not set'}): `)

  console.log('\n💬 DISCORD SETUP')
  console.log('Follow these steps to get Discord bot credentials:')
  console.log('1. Go to https://discord.com/developers/applications')
  console.log('2. Create a new application and add a bot')
  console.log('3. Copy the bot token')
  console.log('4. Add the bot to your server with "View Server Members" permission')
  console.log('5. Get your Discord server ID (right-click server > Copy ID)\n')

  const discordBotToken = await question(`Discord Bot Token (current: ${config.DISCORD_BOT_TOKEN || 'not set'}): `)
  const discordServerId = await question(`Discord Server ID (current: ${config.DISCORD_SERVER_ID || 'not set'}): `)

  // Update config
  if (twitchClientId) config.TWITCH_CLIENT_ID = twitchClientId
  if (twitchAccessToken) config.TWITCH_ACCESS_TOKEN = twitchAccessToken
  if (instagramToken) config.INSTAGRAM_ACCESS_TOKEN = instagramToken
  if (discordBotToken) config.DISCORD_BOT_TOKEN = discordBotToken
  if (discordServerId) config.DISCORD_SERVER_ID = discordServerId

  // Ensure required fields exist
  if (!config.DATABASE_URL) config.DATABASE_URL = '"file:./prisma/dev.db"'
  if (!config.JWT_SECRET) config.JWT_SECRET = '"your-super-secret-jwt-key-here"'
  if (!config.ADMIN_USERNAME) config.ADMIN_USERNAME = '"admin"'
  if (!config.ADMIN_PASSWORD) config.ADMIN_PASSWORD = '"admin123"'

  // Write .env file
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  fs.writeFileSync(envPath, envContent)

  console.log('\n✅ Configuration saved to .env')
  console.log('\n🧪 Testing API connections...')

  // Test Twitch API if configured
  if (config.TWITCH_CLIENT_ID && config.TWITCH_ACCESS_TOKEN) {
    try {
      const fetch = (await import('node-fetch')).default
      const response = await fetch('https://api.twitch.tv/helix/users?login=joedom_', {
        headers: {
          'Client-ID': config.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${config.TWITCH_ACCESS_TOKEN}`
        }
      })
      if (response.ok) {
        console.log('✅ Twitch API connection successful')
      } else {
        console.log('❌ Twitch API connection failed')
      }
    } catch (error) {
      console.log('❌ Twitch API test failed:', error.message)
    }
  }

  // Test Discord API if configured
  if (config.DISCORD_BOT_TOKEN) {
    try {
      const fetch = (await import('node-fetch')).default
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${config.DISCORD_BOT_TOKEN}`
        }
      })
      if (response.ok) {
        console.log('✅ Discord API connection successful')
      } else {
        console.log('❌ Discord API connection failed')
      }
    } catch (error) {
      console.log('❌ Discord API test failed:', error.message)
    }
  }

  console.log('\n🎯 Setup complete!')
  console.log('Users can now verify their accounts at: http://localhost:3000/verify')
  console.log('\nRequirements for verification:')
  console.log('- Follow JoeDom_ on Twitch')
  console.log('- Follow oxsaudio on Instagram')
  console.log('- Be a member of your Discord server')

  rl.close()
}

setupSocialVerification().catch(console.error)
