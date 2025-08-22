# PowerShell script to run database migration on Render
$headers = @{
    'Authorization' = 'Bearer rnd_1ncltbYD61oRz7iKv5ZhH2T7juAd'
    'Content-Type' = 'application/json'
}

$serviceId = 'srv-d2j737ruibrs73d9k0a0'

# First, let's check if we can run a shell command
$shellUrl = "https://api.render.com/v1/services/$serviceId/shell"

Write-Host "🔧 Attempting to fix database schema on Render..."
Write-Host "Service ID: $serviceId"

# Try to get service details first
try {
    $serviceUrl = "https://api.render.com/v1/services/$serviceId"
    $serviceInfo = Invoke-RestMethod -Uri $serviceUrl -Method GET -Headers $headers
    Write-Host "✅ Service found: $($serviceInfo.name)"
    Write-Host "📊 Status: $($serviceInfo.serviceDetails.deployStatus)"
} catch {
    Write-Host "❌ Error getting service info: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "🗄️ The issue is that 'TeamMember' table doesn't exist in production database"
Write-Host "📝 We need to run: npx prisma db push --accept-data-loss"
Write-Host ""
Write-Host "🔗 Go to Render Dashboard and run this command in the shell:"
Write-Host "   https://dashboard.render.com/web/$serviceId"
Write-Host ""
Write-Host "Commands to run in Render shell:"
Write-Host "1. npx prisma db push --accept-data-loss"
Write-Host "2. npx prisma generate"
Write-Host ""
