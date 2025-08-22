# PowerShell script to trigger Render deployment
$headers = @{
    'Authorization' = 'Bearer rnd_1ncltbYD61oRz7iKv5ZhH2T7juAd'
    'Content-Type' = 'application/json'
}

$serviceId = 'srv-d2j737ruibrs73d9k0a0'
$url = "https://api.render.com/v1/services/$serviceId/deploys"

Write-Host "🚀 Triggering deployment for service: $serviceId"
Write-Host "URL: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers
    Write-Host "✅ Deployment triggered successfully!"
    Write-Host "Deploy ID: $($response.id)"
    Write-Host "Status: $($response.status)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}
