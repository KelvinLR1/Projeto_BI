# HUB BI - Start Script

Write-Host ">>> Iniciando HUB BI Enterprise..." -ForegroundColor Cyan

# Start Backend
Write-Host ">>> Iniciando Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

# Start Frontend
Write-Host ">>> Iniciando Frontend (Next.js)..." -ForegroundColor Magenta

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host ">>> Instalando dependências do Frontend..." -ForegroundColor Yellow
    npm install --prefix frontend
}

Set-Location frontend
npm run dev
