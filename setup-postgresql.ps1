# PostgreSQL Setup for Tournament Portal
Write-Host "🐘 Setting up PostgreSQL for Tournament Portal" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Starting PostgreSQL container..." -ForegroundColor Yellow
docker-compose up -d postgres

Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "🔄 Running Prisma migrations..." -ForegroundColor Yellow
npx prisma db push

Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npx prisma db seed

Write-Host "✅ PostgreSQL setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Connection details:" -ForegroundColor Cyan
Write-Host "   Host: localhost"
Write-Host "   Port: 5432" 
Write-Host "   Database: tournament_db"
Write-Host "   Username: tournament_user"
Write-Host "   Password: tournament_password"
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npm run dev"
Write-Host "   2. Visit: http://localhost:3000"
Write-Host "   3. Admin login: admin / rootmr"
