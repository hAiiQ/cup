const { RenderAPI } = require('./render-deploy')

const api = new RenderAPI('rnd_1ncltbYD61oRz7iKv5ZhH2T7juAd')

async function checkAdminPassword() {
  try {
    // Get services
    const servicesResponse = await api.getServices()
    const service = servicesResponse.data.find(item => {
      const svc = item.service || item
      return svc.name && svc.name.includes('Path of Loki')
    })
    
    if (!service) {
      console.log('❌ Service not found')
      return
    }
    
    const serviceObj = service.service || service
    console.log(`✅ Found service: ${serviceObj.name}`)
    console.log(`🆔 Service ID: ${serviceObj.id}`)
    
    // Get environment variables
    const envResponse = await api.getEnvironmentVariables(serviceObj.id)
    
    if (envResponse.status === 200) {
      console.log('\n🔐 Current Environment Variables:')
      envResponse.data.forEach(env => {
        if (env.key && env.key.includes('ADMIN')) {
          console.log(`${env.key}: ${env.value || '[NOT SET]'}`)
        }
      })
      
      // Check if ADMIN_PASSWORD is rootmr
      const adminPassword = envResponse.data.find(env => env.key === 'ADMIN_PASSWORD')
      if (adminPassword && adminPassword.value === 'rootmr') {
        console.log('\n✅ ADMIN_PASSWORD is correctly set to "rootmr"')
      } else {
        console.log('\n❌ ADMIN_PASSWORD is NOT set to "rootmr"')
        console.log('Current value:', adminPassword ? adminPassword.value : '[NOT SET]')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkAdminPassword()
