const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBrackets() {
  try {
    const matches = await prisma.match.findMany({
      select: { id: true, bracket: true, round: true, team1: true, team2: true }
    });
    
    console.log('📊 Alle Matches:');
    matches.forEach(match => {
      console.log(`Match ${match.id}: bracket='${match.bracket}', round='${match.round}', teams='${match.team1}' vs '${match.team2}'`);
    });
    
    console.log('\n🎯 Grand Finals Match suchen:');
    const grandMatch = matches.find(m => 
      m.bracket === 'grand' || 
      m.bracket === 'final' || 
      m.round === 'grand' || 
      m.round === 'final' ||
      m.round === 'finals'
    );
    
    if (grandMatch) {
      console.log('✅ Grand Finals gefunden:', grandMatch);
    } else {
      console.log('❌ GRAND FINALS NICHT GEFUNDEN - das ist das Problem!');
      console.log('Alle bracket Werte:', [...new Set(matches.map(m => m.bracket))]);
      console.log('Alle round Werte:', [...new Set(matches.map(m => m.round))]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrackets();
