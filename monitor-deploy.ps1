# PowerShell script to monitor deployment
$headers = @{
    'Authorization' = 'Bearer rnd_1ncltbYD61oRz7iKv5ZhH2T7juAd'
    'Content-Type' = 'application/json'
}

$serviceId = 'srv-d2j737ruibrs73d9k0a0'
$deployId = 'dep-d2jstbe3jp1c73fh5gf0'
$url = "https://api.render.com/v1/services/$serviceId/deploys"

Write-Host "📊 Monitoring deployment: $deployId"
Write-Host "Service: https://path-of-loki.onrender.com"
Write-Host "================================"

$attempts = 0
$maxAttempts = 30

while ($attempts -lt $maxAttempts) {
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers
        $currentDeploy = $response | Where-Object { $_.id -eq $deployId } | Select-Object -First 1
        
        if ($currentDeploy) {
            $status = $currentDeploy.status
            $time = Get-Date -Format "HH:mm:ss"
            Write-Host "[$time] Status: $status"
            
            if ($status -eq "live") {
                Write-Host "🎉 Deployment completed successfully!"
                Write-Host "🌐 Your site is now live with the user deletion fix!"
                Write-Host "🔗 URL: https://path-of-loki.onrender.com"
                break
            } elseif ($status -eq "build_failed" -or $status -eq "failed") {
                Write-Host "❌ Deployment failed!"
                break
            }
        }
        
        Start-Sleep -Seconds 10
        $attempts++
        
    } catch {
        Write-Host "⚠️ Error checking status: $($_.Exception.Message)"
        break
    }
}

if ($attempts -ge $maxAttempts) {
    Write-Host "⏰ Monitoring timeout - check Render dashboard for final status"
    Write-Host "🔗 Dashboard: https://dashboard.render.com/web/$serviceId"
}
