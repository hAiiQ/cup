/**
 * Update admin password in production database on Render
 */

async function updateProductionAdminPassword() {
  try {
    console.log('🔄 Updating admin password in production database...')
    
    // Call the production API to update the admin password
    const response = await fetch('https://path-of-loki.onrender.com/api/admin/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newPassword: 'rootmr',
        adminKey: 'emergency-update-key-2024'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Production admin password updated successfully!')
      console.log('🔑 New password: rootmr')
      console.log('📊 Updated count:', result.updatedCount)
    } else {
      console.log('❌ Failed to update production admin password')
      console.log('Status:', response.status)
      console.log('Error:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Error updating production admin password:', error.message)
  }
}

updateProductionAdminPassword()
