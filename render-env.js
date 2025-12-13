/**
 * Render Environment Manager
 * Manage environment variables and debug production issues
 */

const { RenderAPI } = require('./render-deploy')

class RenderEnvironmentManager {
  constructor(apiKey) {
    this.api = new RenderAPI(apiKey)
  }

  async findService(namePattern = 'Path of Gambit') {
    const servicesResponse = await this.api.getServices()
    
    if (servicesResponse.status !== 200) {
      throw new Error('Failed to fetch services')
    }
    
    const service = servicesResponse.data.find(item => {
      const svc = item.service || item
      return svc.name && svc.name.toLowerCase().includes(namePattern.toLowerCase())
    })
    
    if (!service) {
      console.log('Available services:')
      servicesResponse.data.forEach(item => {
        const svc = item.service || item
        console.log(`  - ${svc.name || 'Unknown'}`)
      })
      throw new Error(`Service "${namePattern}" not found`)
    }
    
    return service.service || service
  }

  async checkEnvironment(serviceName = 'Path of Gambit') {
    console.log('🔍 Environment Check')
    console.log('===================')
    
    try {
      const service = await this.findService(serviceName)
      console.log(`✅ Service: ${service.name}`)
      console.log(`🆔 ID: ${service.id}`)
      console.log(`🌐 URL: ${service.serviceDetails?.url}`)
      console.log(`📊 Status: ${service.serviceDetails?.deployStatus}`)
      console.log('')
      
      // Get environment variables
      const envResponse = await this.api.getEnvironmentVariables(service.id)
      
      if (envResponse.status === 200) {
        console.log('🔐 Environment Variables:')
        console.log('========================')
        
        const requiredVars = [
          'DATABASE_URL',
          'JWT_SECRET', 
          'NEXTAUTH_SECRET',
          'NODE_ENV'
        ]
        
        envResponse.data.forEach(env => {
          const isRequired = requiredVars.includes(env.key)
          const status = env.value ? '✅' : '❌'
          const marker = isRequired ? '⭐' : '  '
          
          console.log(`${marker} ${status} ${env.key}: ${env.value ? '[SET]' : '[NOT SET]'}`)
        })
        
        // Check for missing required variables
        const presentVars = envResponse.data.map(env => env.key)
        const missingVars = requiredVars.filter(v => !presentVars.includes(v))
        
        if (missingVars.length > 0) {
          console.log('')
          console.log('⚠️  Missing required variables:')
          missingVars.forEach(v => console.log(`   - ${v}`))
        }
        
      } else {
        console.log('❌ Failed to fetch environment variables')
      }
      
      return service
      
    } catch (error) {
      console.error('❌ Error:', error.message)
      return null
    }
  }

  async getLogs(serviceName = 'path-of-gambit', lines = 100) {
    console.log('📋 Recent Logs')
    console.log('==============')
    
    try {
      const service = await this.findService(serviceName)
      
      // Note: Render API doesn't provide direct log access
      // This would need to be implemented with websocket connection
      console.log(`🔗 View logs at: https://dashboard.render.com/web/${service.id}/logs`)
      
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }

  async restartService(serviceName = 'path-of-gambit') {
    console.log('🔄 Restarting Service')
    console.log('====================')
    
    try {
      const service = await this.findService(serviceName)
      
      // Trigger a new deployment (effectively restarts the service)
      const deployResponse = await this.api.triggerDeploy(service.id)
      
      if (deployResponse.status === 201) {
        console.log('✅ Restart triggered successfully!')
        console.log(`📋 Deploy ID: ${deployResponse.data.id}`)
      } else {
        console.log('❌ Failed to restart service')
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }

  async runDatabaseCheck(serviceName = 'path-of-gambit') {
    console.log('🗄️ Database Connection Check')
    console.log('============================')
    
    try {
      const service = await this.findService(serviceName)
      
      // Check if DATABASE_URL is set
      const envResponse = await this.api.getEnvironmentVariables(service.id)
      
      if (envResponse.status === 200) {
        const dbUrl = envResponse.data.find(env => env.key === 'DATABASE_URL')
        
        if (dbUrl && dbUrl.value) {
          console.log('✅ DATABASE_URL is configured')
          
          // Parse the database URL to show connection info (without credentials)
          try {
            const url = new URL(dbUrl.value)
            console.log(`🏠 Host: ${url.hostname}`)
            console.log(`🔌 Port: ${url.port || 'default'}`)
            console.log(`🗄️ Database: ${url.pathname.slice(1)}`)
            console.log(`👤 User: ${url.username || 'not specified'}`)
          } catch (e) {
            console.log('⚠️ Could not parse DATABASE_URL format')
          }
          
        } else {
          console.log('❌ DATABASE_URL not configured!')
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }
}

async function main() {
  const command = process.argv[2]
  const serviceName = process.argv[3] || 'path-of-gambit'
  
  if (!process.env.RENDER_API_KEY) {
    console.log('❌ RENDER_API_KEY environment variable not set!')
    console.log('📝 To set it, run:')
    console.log('   $env:RENDER_API_KEY="your-api-key-here"')
    console.log('')
    console.log('🔑 Get your API key from: https://dashboard.render.com/user/settings')
    return
  }
  
  const manager = new RenderEnvironmentManager(process.env.RENDER_API_KEY)
  
  switch (command) {
    case 'env':
    case 'environment':
      await manager.checkEnvironment(serviceName)
      break
      
    case 'logs':
      await manager.getLogs(serviceName)
      break
      
    case 'restart':
      await manager.restartService(serviceName)
      break
      
    case 'db':
    case 'database':
      await manager.runDatabaseCheck(serviceName)
      break
      
    default:
      console.log('🛠️ Render Environment Manager')
      console.log('============================')
      console.log('')
      console.log('Usage: node render-env.js <command> [service-name]')
      console.log('')
      console.log('Commands:')
      console.log('  env        - Check environment variables')
      console.log('  logs       - View logs (opens dashboard)')
      console.log('  restart    - Restart the service')
      console.log('  db         - Check database connection')
      console.log('')
      console.log('Examples:')
      console.log('  node render-env.js env')
      console.log('  node render-env.js restart path-of-gambit')
      console.log('  node render-env.js db')
  }
}

// Export for use in other scripts
module.exports = { RenderEnvironmentManager }

// Run if called directly
if (require.main === module) {
  main()
}
