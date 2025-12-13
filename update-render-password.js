/**
 * Update Admin Password on Render
 */

const { RenderAPI } = require('./render-deploy')

class RenderPasswordUpdater {
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

  async updateAdminPassword(serviceName = 'Path of Gambit', newPassword = 'rootmr') {
    console.log('🔐 Updating Admin Password on Render')
    console.log('====================================')
    
    try {
      const service = await this.findService(serviceName)
      console.log(`✅ Service: ${service.name}`)
      console.log(`🆔 ID: ${service.id}`)
      console.log('')
      
      // Get current environment variables
      console.log('📋 Fetching current environment variables...')
      const envResponse = await this.api.getEnvironmentVariables(service.id)
      
      if (envResponse.status !== 200) {
        throw new Error('Failed to fetch environment variables')
      }
      
      // Check if ADMIN_PASSWORD exists
      const existingAdminPassword = envResponse.data.find(env => env.key === 'ADMIN_PASSWORD')
      const existingAdminUsername = envResponse.data.find(env => env.key === 'ADMIN_USERNAME')
      
      console.log(`🔍 Current ADMIN_USERNAME: ${existingAdminUsername ? '[SET]' : '[NOT SET]'}`)
      console.log(`🔍 Current ADMIN_PASSWORD: ${existingAdminPassword ? '[SET]' : '[NOT SET]'}`)
      console.log('')
      
      // Update or create ADMIN_PASSWORD
      console.log(`🔄 Setting ADMIN_PASSWORD to: ${newPassword}`)
      
      // Update ADMIN_USERNAME first
      const usernameResponse = await this.api.updateEnvironmentVariable(service.id, 'ADMIN_USERNAME', 'admin')
      if (usernameResponse.status === 200 || usernameResponse.status === 201) {
        console.log('✅ ADMIN_USERNAME updated successfully!')
      } else {
        console.log('⚠️ Failed to update ADMIN_USERNAME:', usernameResponse.status)
      }
      
      // Update ADMIN_PASSWORD
      const passwordResponse = await this.api.updateEnvironmentVariable(service.id, 'ADMIN_PASSWORD', newPassword)
      
      if (passwordResponse.status === 200 || passwordResponse.status === 201) {
        console.log('✅ Admin password updated successfully!')
        console.log('')
        console.log('🔑 New Admin Credentials:')
        console.log('  Username: admin')
        console.log(`  Password: ${newPassword}`)
        console.log('')
        console.log('🚀 Triggering deployment to apply changes...')
        
        // Trigger deployment
        const deployResponse = await this.api.triggerDeploy(service.id)
        if (deployResponse.status === 201) {
          console.log(`✅ Deployment triggered! Deploy ID: ${deployResponse.data.id}`)
          console.log('⏳ Changes will be active after deployment completes')
        } else {
          console.log('⚠️ Failed to trigger deployment - you may need to deploy manually')
        }
        
      } else {
        console.log('❌ Failed to update ADMIN_PASSWORD')
        console.log('Response:', passwordResponse.status, passwordResponse.data)
      }
      
    } catch (error) {
      console.error('❌ Error updating admin password:', error.message)
    }
  }
}

async function main() {
  const apiKey = process.argv[2] || process.env.RENDER_API_KEY
  const newPassword = process.argv[3] || 'rootmr'
  
  if (!apiKey) {
    console.log('❌ Render API key required!')
    console.log('📝 Usage: node update-render-password.js <API_KEY> [PASSWORD]')
    console.log('📝 Or set RENDER_API_KEY environment variable')
    return
  }
  
  const updater = new RenderPasswordUpdater(apiKey)
  await updater.updateAdminPassword('Path of Gambit', newPassword)
}

if (require.main === module) {
  main()
}
