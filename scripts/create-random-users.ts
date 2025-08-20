import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const gameNames = [
  'ShadowStrike', 'PhoenixRising', 'IceBreaker', 'StormFury', 'NightHunter',
  'BlazeMaster', 'ThunderBolt', 'CyberNinja', 'FrostBite', 'DragonSlayer',
  'VoidWalker', 'StarCrusher', 'DarkPhoenix', 'IronWolf', 'MysticBlade',
  'FlameWarden', 'ShadowHawk', 'LightBringer', 'DeathStrike', 'WindRunner',
  'SoulReaper', 'FireStorm', 'IceQueen', 'NightShade', 'BloodHound',
  'GhostRider', 'StormBreaker', 'DarkKnight', 'SkyWalker', 'TitanForce',
  'VenomStrike', 'CrimsonBlade', 'SilverFox', 'GoldenEagle', 'BlackPanther',
  'WhiteWolf', 'RedDragon', 'BlueLightning', 'GreenViper', 'PurpleStorm',
  'OrangeFlame', 'YellowThunder', 'PinkRose', 'BrownBear', 'GrayGhost',
  'TurquoiseWave', 'MagentaMoon', 'IndigoStar', 'VioletSun'
]

const ranks = ['Gold', 'Platinum', 'Diamond', 'Grandmaster', 'Celestial', 'Eternity']

const discordNames = [
  'gamer_pro#1234', 'elite_player#5678', 'noob_slayer#9999', 'team_leader#4567',
  'silent_assassin#7890', 'master_chief#2345', 'cyber_warrior#6789', 'night_owl#3456',
  'fire_lord#8901', 'ice_king#4321', 'thunder_god#5432', 'wind_master#6543',
  'earth_shaker#7654', 'water_bender#8765', 'space_ranger#9876', 'time_walker#0987',
  'shadow_dancer#1098', 'light_bearer#2109', 'dark_mage#3210', 'bright_star#4320',
  'speed_demon#5431', 'power_house#6542', 'tech_wizard#7653', 'magic_user#8764',
  'battle_lord#9875', 'war_chief#0986', 'peace_keeper#1097', 'soul_guardian#2108',
  'mind_reader#3219', 'heart_breaker#4329', 'dream_catcher#5430', 'wish_maker#6541',
  'star_gazer#7652', 'moon_walker#8763', 'sun_chaser#9874', 'cloud_rider#0985',
  'storm_caller#1096', 'rain_maker#2107', 'snow_queen#3218', 'ice_prince#4328',
  'fire_princess#5429', 'water_knight#6540', 'earth_guardian#7651', 'air_dancer#8762',
  'void_master#9873', 'chaos_lord#0984', 'order_keeper#1095', 'balance_seeker#2106'
]

const twitchNames = [
  'ProGamer2024', 'EliteStreamer', 'NoobDestroyer', 'TeamCaptain', 'SilentKiller',
  'ChiefMaster', 'CyberHero', 'NightOwlGaming', 'FireLordTTV', 'IceKingLive',
  'ThunderGodStream', 'WindMasterTTV', 'EarthShakerLive', 'WaterBenderTV', 'SpaceRangerTTV',
  'TimeWalkerStream', 'ShadowDancerTV', 'LightBearerTTV', 'DarkMageLive', 'BrightStarTV',
  'SpeedDemonTTV', 'PowerHouseLive', 'TechWizardTV', 'MagicUserTTV', 'BattleLordStream',
  'WarChiefTV', 'PeaceKeeperTTV', 'SoulGuardianLive', 'MindReaderTV', 'HeartBreakerTTV',
  'DreamCatcherStream', 'WishMakerTV', 'StarGazerTTV', 'MoonWalkerLive', 'SunChaserTV',
  'CloudRiderTTV', 'StormCallerStream', 'RainMakerTV', 'SnowQueenTTV', 'IcePrinceLive',
  'FirePrincessTV', 'WaterKnightTTV', 'EarthGuardianStream', 'AirDancerTV', 'VoidMasterTTV',
  'ChaosLordLive', 'OrderKeeperTV', 'BalanceSeekerTTV'
]

const instagramNames = [
  'pro_gamer_life', 'elite_gaming', 'noob_destroyer_official', 'team_captain_gaming',
  'silent_killer_esports', 'chief_master_gaming', 'cyber_hero_official', 'night_owl_gamer',
  'fire_lord_gaming', 'ice_king_esports', 'thunder_god_official', 'wind_master_gaming',
  'earth_shaker_esports', 'water_bender_gaming', 'space_ranger_official', 'time_walker_gaming',
  'shadow_dancer_esports', 'light_bearer_gaming', 'dark_mage_official', 'bright_star_gaming',
  'speed_demon_esports', 'power_house_gaming', 'tech_wizard_official', 'magic_user_gaming',
  'battle_lord_esports', 'war_chief_gaming', 'peace_keeper_official', 'soul_guardian_gaming',
  'mind_reader_esports', 'heart_breaker_gaming', 'dream_catcher_official', 'wish_maker_gaming',
  'star_gazer_esports', 'moon_walker_gaming', 'sun_chaser_official', 'cloud_rider_gaming',
  'storm_caller_esports', 'rain_maker_gaming', 'snow_queen_official', 'ice_prince_gaming',
  'fire_princess_esports', 'water_knight_gaming', 'earth_guardian_official', 'air_dancer_gaming',
  'void_master_esports', 'chaos_lord_gaming', 'order_keeper_official', 'balance_seeker_gaming'
]

async function createRandomUsers() {
  console.log('🎮 Erstelle 48 zufällige Gaming Accounts...')
  
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  for (let i = 0; i < 48; i++) {
    const username = `user${i + 1}_${Math.random().toString(36).substring(2, 8)}`
    const inGameName = gameNames[i] || `Player${i + 1}`
    const inGameRank = ranks[Math.floor(Math.random() * ranks.length)]
    const discordName = discordNames[i] || `discord_user${i + 1}#${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
    const twitchName = twitchNames[i] || `twitch_user${i + 1}`
    const instagramName = instagramNames[i] || `insta_user${i + 1}`
    
    // 80% der User sind verifiziert und haben Regeln akzeptiert
    const isVerified = Math.random() > 0.2
    const rulesAccepted = Math.random() > 0.1
    
    try {
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          inGameName,
          inGameRank,
          discordName,
          twitchName,
          instagramName,
          isVerified,
          rulesAccepted,
          tier: null, // Admin wird später Tiers zuweisen
        }
      })
      
      console.log(`✅ User ${i + 1}/48 erstellt: ${username} (${inGameName})`)
    } catch (error) {
      console.error(`❌ Fehler beim Erstellen von User ${i + 1}:`, error)
    }
  }
  
  console.log('🎉 Alle 48 Accounts erfolgreich erstellt!')
  
  // Statistiken anzeigen
  const totalUsers = await prisma.user.count()
  const verifiedUsers = await prisma.user.count({ where: { isVerified: true } })
  const rulesAcceptedUsers = await prisma.user.count({ where: { rulesAccepted: true } })
  
  console.log('\n📊 Statistiken:')
  console.log(`👥 Gesamt Accounts: ${totalUsers}`)
  console.log(`✅ Verifizierte Accounts: ${verifiedUsers}`)
  console.log(`📋 Regeln akzeptiert: ${rulesAcceptedUsers}`)
}

createRandomUsers()
  .catch((e) => {
    console.error('❌ Fehler beim Erstellen der Accounts:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
