# HUB BI - Stop Script (Versão Robusta)

Write-Host "🛑 Encerrando processos do HUB BI..." -ForegroundColor Red

# Stop Backend (Port 8000)
try {
    $backendConns = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 }
    if ($backendConns) {
        Write-Host ">>> Finalizando processos do Backend (Porta 8000)..." -ForegroundColor Yellow
        foreach ($conn in $backendConns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
} catch {}

# Stop Frontend (Port 3000)
try {
    $frontendConns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 }
    if ($frontendConns) {
        Write-Host ">>> Finalizando processos do Frontend (Porta 3000)..." -ForegroundColor Magenta
        foreach ($conn in $frontendConns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
} catch {}

# Cleanup adicional por nome de processo (Garantia)
Get-Process "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "✅ Todos os serviços foram interrompidos com sucesso." -ForegroundColor Green
