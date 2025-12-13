/**
 * Quick Render Deployment Script
 * Usage: node quick-deploy.js [service-name]
 */

const { RenderAPI } = require('./render-deploy')

async function quickDeploy(serviceName = 'path-of-gambit') {
  console.log('🚀 Quick Deploy Script')
  console.log('=====================')
  
  if (!process.env.RENDER_API_KEY) {
    console.log('❌ RENDER_API_KEY not set!')
    console.log('Run: $env:RENDER_API_KEY="your-key"')
    return
  }

  const api = new RenderAPI(process.env.RENDER_API_KEY)
  
  try {
    // Get services
    const servicesResponse = await api.getServices()
    
    if (servicesResponse.status !== 200) {
      console.log('❌ Failed to fetch services')
      return
    }
    
    // Find the service
    const serviceItem = servicesResponse.data.find(item => {
      const svc = item.service || item
      return svc.name && svc.name.toLowerCase().includes(serviceName.toLowerCase())
    })
    
    if (!serviceItem) {
      console.log(`❌ Service "${serviceName}" not found!`)
      console.log('Available services:')
      servicesResponse.data.forEach(item => {
        const svc = item.service || item
        console.log(`  - ${svc.name || 'Unknown'}`)
      })
      return
    }
    
    const service = serviceItem.service || serviceItem
    
    console.log(`✅ Found service: ${service.name} (${service.id})`)
    
    // Trigger deployment
    const deployResponse = await api.triggerDeploy(service.id)
    
    if (deployResponse.status === 201) {
      console.log('🎉 Deployment triggered successfully!')
      console.log(`📋 Deploy ID: ${deployResponse.data.id}`)
      console.log(`🔗 URL: ${service.serviceDetails?.url}`)
      
      // Monitor deployment status
      console.log('⏳ Monitoring deployment...')
      await monitorDeployment(api, service.id, deployResponse.data.id)
      
    } else {
      console.log('❌ Failed to trigger deployment:', deployResponse.data)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function monitorDeployment(api, serviceId, deployId) {
  let attempts = 0
  const maxAttempts = 30 // 5 minutes with 10 second intervals
  
  while (attempts < maxAttempts) {
    try {
      const deploysResponse = await api.getDeploys(serviceId)
      
      if (deploysResponse.status === 200) {
        const currentDeploy = deploysResponse.data.find(d => d.id === deployId)
        
        if (currentDeploy) {
          console.log(`📊 Status: ${currentDeploy.status}`)
          
          if (currentDeploy.status === 'live') {
            console.log('🎉 Deployment completed successfully!')
            return
          } else if (currentDeploy.status === 'build_failed' || currentDeploy.status === 'failed') {
            console.log('❌ Deployment failed!')
            return
          }
        }
      }
      
      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000))
      attempts++
      
    } catch (error) {
      console.log('⚠️ Error checking deployment status:', error.message)
      break
    }
  }
  
  console.log('⏰ Monitoring timeout - check Render dashboard for final status')
}

// Get service name from command line argument
const serviceName = process.argv[2] || 'path-of-gambit'
quickDeploy(serviceName)
