export const SOCIAL_REQUIREMENTS = {
  twitch: {
    channel: 'JoeDom',
    label: 'Twitch',
    url: 'https://www.twitch.tv/JoeDom',
    action: 'Folge JoeDom auf Twitch',
  },
  instagram: {
    username: 'joetothedom',
    label: 'Instagram',
    url: 'https://www.instagram.com/joetothedom/',
    action: 'Folge @joetothedom auf Instagram',
  },
  discord: {
    inviteCode: 'A9pNRkaam',
    label: 'Discord',
    url: 'https://discord.gg/A9pNRkaam',
    guildId: '744595661889994852',
    action: 'Tritt dem Boss Gang Discord bei',
  },
  tiktok: {
    username: 'joetothedom',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@joetothedom',
    action: 'Folge @joetothedom auf TikTok',
  },
} as const

export type SocialPlatform = keyof typeof SOCIAL_REQUIREMENTS
