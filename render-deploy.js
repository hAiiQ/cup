/**
 * Render Deployment Script
 * This script allows direct interaction with Render API
 */

const https = require('https')

class RenderAPI {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'api.render.com'
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseURL,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }

      if (data) {
        const postData = JSON.stringify(data)
        options.headers['Content-Length'] = Buffer.byteLength(postData)
      }

      const req = https.request(options, (res) => {
        let responseData = ''
        
        res.on('data', (chunk) => {
          responseData += chunk
        })
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(responseData)
            resolve({ status: res.statusCode, data: jsonData })
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData })
          }
        })
      })

      req.on('error', (e) => {
        reject(e)
      })

      if (data) {
        req.write(JSON.stringify(data))
      }
      
      req.end()
    })
  }

  async getServices() {
    console.log('🔍 Fetching services...')
    const response = await this.makeRequest('GET', '/v1/services')
    return response
  }

  async getService(serviceId) {
    console.log(`🔍 Fetching service ${serviceId}...`)
    const response = await this.makeRequest('GET', `/v1/services/${serviceId}`)
    return response
  }

  async triggerDeploy(serviceId) {
    console.log(`🚀 Triggering deployment for service ${serviceId}...`)
    const response = await this.makeRequest('POST', `/v1/services/${serviceId}/deploys`)
    return response
  }

  async getDeploys(serviceId) {
    console.log(`📋 Getting deployments for service ${serviceId}...`)
    const response = await this.makeRequest('GET', `/v1/services/${serviceId}/deploys`)
    return response
  }

  async getEnvironmentVariables(serviceId) {
    console.log(`🔐 Getting environment variables for service ${serviceId}...`)
    const response = await this.makeRequest('GET', `/v1/services/${serviceId}/env-vars`)
    return response
  }

  async updateEnvironmentVariable(serviceId, key, value) {
    console.log(`🔧 Updating environment variable ${key} for service ${serviceId}...`)
    const response = await this.makeRequest('PUT', `/v1/services/${serviceId}/env-vars/${key}`, {
      value: value
    })
    return response
  }
}

// Main function
async function main() {
  console.log('🎯 Render API Client')
  console.log('==================')
  
  // Check if API key is provided
  if (!process.env.RENDER_API_KEY) {
    console.log('❌ RENDER_API_KEY environment variable not set!')
    console.log('📝 To set it, run:')
    console.log('   $env:RENDER_API_KEY="your-api-key-here"')
    console.log('')
    console.log('🔑 Get your API key from: https://dashboard.render.com/user/settings')
    return
  }

  const api = new RenderAPI(process.env.RENDER_API_KEY)
  
  try {
    // Get all services
    const servicesResponse = await api.getServices()
    
    if (servicesResponse.status !== 200) {
      console.log('❌ Failed to fetch services:', servicesResponse.data)
      return
    }
    
    console.log('✅ Services found:')
    
    if (Array.isArray(servicesResponse.data)) {
      servicesResponse.data.forEach((item, index) => {
        const service = item.service || item // Handle both response formats
        console.log(`${index + 1}. ${service.name || 'Unknown'} (${service.type || 'Unknown'}) - ${service.id || 'No ID'}`)
        console.log(`   URL: ${service.serviceDetails?.url || service.url || 'N/A'}`)
        console.log(`   Status: ${service.serviceDetails?.deployStatus || service.status || 'Unknown'}`)
        console.log(`   Dashboard: ${service.dashboardUrl || 'N/A'}`)
        console.log('')
      })
    } else {
      console.log('Services data is not an array:', servicesResponse.data)
    }
    
    // Find our tournament service
    const tournamentService = servicesResponse.data.find(item => {
      const service = item.service || item
      return service.name && (
        service.name.toLowerCase().includes('path-of-gambit') || 
        service.name.toLowerCase().includes('tournament') ||
        service.name.toLowerCase().includes('cup')
      )
    })?.service || servicesResponse.data.find(item => {
      const service = item.service || item
      return service.name && (
        service.name.toLowerCase().includes('path-of-gambit') || 
        service.name.toLowerCase().includes('tournament') ||
        service.name.toLowerCase().includes('cup')
      )
    })
    
    if (tournamentService) {
      console.log(`🎯 Found tournament service: ${tournamentService.name}`)
      
      // Get recent deployments
      const deploysResponse = await api.getDeploys(tournamentService.id)
      if (deploysResponse.status === 200 && deploysResponse.data.length > 0) {
        console.log('📋 Recent deployments:')
        deploysResponse.data.slice(0, 3).forEach((deploy, index) => {
          console.log(`${index + 1}. ${deploy.status} - ${new Date(deploy.createdAt).toLocaleString()}`)
        })
      }
      
      // Get environment variables
      const envResponse = await api.getEnvironmentVariables(tournamentService.id)
      if (envResponse.status === 200) {
        console.log('🔐 Environment Variables:')
        envResponse.data.forEach(env => {
          console.log(`   ${env.key}: ${env.value ? '[SET]' : '[NOT SET]'}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Export for use in other scripts
module.exports = { RenderAPI }

// Run if called directly
if (require.main === module) {
  main()
}
