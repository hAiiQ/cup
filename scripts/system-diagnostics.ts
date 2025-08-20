import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runSystemDiagnostics() {
  console.log('🔍 SYSTEM DIAGNOSTICS - Vollständige Überprüfung\n')
  
  try {
    // 1. Basis-Statistiken
    console.log('📊 DATENBANK ÜBERSICHT:')
    const userCount = await prisma.user.count()
    const adminCount = await prisma.admin.count()
    const teamCount = await prisma.team.count()
    const teamMemberCount = await prisma.teamMember.count()
    const matchCount = await prisma.match.count()
    
    console.log(`👥 User: ${userCount}`)
    console.log(`👤 Admins: ${adminCount}`)
    console.log(`🏆 Teams: ${teamCount}`)
    console.log(`🔗 Team Mitglieder: ${teamMemberCount}`)
    console.log(`⚔️ Matches: ${matchCount}\n`)

    // 2. Doppelte Usernames überprüfen
    console.log('🔎 DOPPELTE USERNAMES:')
    const duplicateUsernames = await prisma.user.groupBy({
      by: ['username'],
      having: {
        username: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        username: true
      }
    })
    
    if (duplicateUsernames.length > 0) {
      console.log('❌ Doppelte Usernames gefunden:')
      duplicateUsernames.forEach(dup => {
        console.log(`  - "${dup.username}": ${dup._count.username}x`)
      })
    } else {
      console.log('✅ Keine doppelten Usernames')
    }

    // 3. Doppelte Admin Usernames
    console.log('\n🔎 DOPPELTE ADMIN USERNAMES:')
    const duplicateAdminUsernames = await prisma.admin.groupBy({
      by: ['username'],
      having: {
        username: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        username: true
      }
    })
    
    if (duplicateAdminUsernames.length > 0) {
      console.log('❌ Doppelte Admin Usernames gefunden:')
      duplicateAdminUsernames.forEach(dup => {
        console.log(`  - "${dup.username}": ${dup._count.username}x`)
      })
    } else {
      console.log('✅ Keine doppelten Admin Usernames')
    }

    // 4. Team Integritätsprüfung
    console.log('\n🏆 TEAM INTEGRITÄTSPRÜFUNG:')
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })
    
    let teamErrors = 0
    teams.forEach(team => {
      const actualMemberCount = team.members.length
      console.log(`📋 ${team.name} (Position ${team.position}): ${actualMemberCount}/6 Mitglieder`)
      
      if (actualMemberCount > 6) {
        console.log(`  ❌ Zu viele Mitglieder! (${actualMemberCount}/6)`)
        teamErrors++
      }
      
      // Doppelte User in Teams prüfen
      const userIds = team.members.map(m => m.user.id)
      const uniqueUserIds = Array.from(new Set(userIds))
      if (userIds.length !== uniqueUserIds.length) {
        console.log(`  ❌ Doppelte User in Team gefunden!`)
        teamErrors++
      }
    })
    
    if (teamErrors === 0) {
      console.log('✅ Alle Teams sind korrekt konfiguriert')
    }

    // 5. User ohne notwendige Daten
    console.log('\n👤 USER DATENQUALITÄT:')
    const usersWithoutGameName = await prisma.user.count({
      where: { inGameName: null }
    })
    const usersWithoutRank = await prisma.user.count({
      where: { inGameRank: null }
    })
    const usersWithoutTier = await prisma.user.count({
      where: { tier: null }
    })
    const unverifiedUsers = await prisma.user.count({
      where: { isVerified: false }
    })
    const usersWithoutRules = await prisma.user.count({
      where: { rulesAccepted: false }
    })
    
    console.log(`📝 Ohne In-Game Name: ${usersWithoutGameName}`)
    console.log(`🏅 Ohne Rank: ${usersWithoutRank}`)
    console.log(`🎯 Ohne Tier: ${usersWithoutTier}`)
    console.log(`❓ Nicht verifiziert: ${unverifiedUsers}`)
    console.log(`📋 Regeln nicht akzeptiert: ${usersWithoutRules}`)

    // 6. Team Member Konsistenz
    console.log('\n🔗 TEAM-MEMBER KONSISTENZ:')
    const allTeamMembers = await prisma.teamMember.findMany({
      include: {
        user: true,
        team: true
      }
    })
    
    let orphanedCount = 0
    allTeamMembers.forEach(member => {
      if (!member.user || !member.team) {
        orphanedCount++
      }
    })
    
    if (orphanedCount > 0) {
      console.log(`❌ ${orphanedCount} verwaiste TeamMember-Einträge`)
    } else {
      console.log('✅ Alle TeamMember-Einträge sind korrekt verknüpft')
    }

    // 7. Match System Check
    console.log('\n⚔️ MATCH SYSTEM:')
    const matches = await prisma.match.findMany()
    console.log(`📊 Insgesamt ${matches.length} Matches im System`)
    
    const winnerBracketMatches = matches.filter(m => m.bracket === 'winner').length
    const loserBracketMatches = matches.filter(m => m.bracket === 'loser').length
    
    console.log(`🏆 Winner Bracket: ${winnerBracketMatches} Matches`)
    console.log(`💔 Loser Bracket: ${loserBracketMatches} Matches`)

    // 8. Database Schema Check
    console.log('\n🗃️ SCHEMA VALIDIERUNG:')
    const sampleUser = await prisma.user.findFirst()
    if (sampleUser) {
      const hasInstagram = 'instagramName' in sampleUser
      console.log(`📱 Instagram Feld: ${hasInstagram ? '✅ Vorhanden' : '❌ Fehlt'}`)
    }

    console.log('\n🎉 DIAGNOSTICS ABGESCHLOSSEN')
    
  } catch (error) {
    console.error('❌ Fehler bei der Diagnose:', error)
  } finally {
    await prisma.$disconnect()
  }
}

runSystemDiagnostics()
