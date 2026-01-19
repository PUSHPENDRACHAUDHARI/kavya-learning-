# Test API endpoints for local development
# Usage: In PowerShell, run from backend folder:
#    .\test-api.ps1

param(
	[string]$BaseUrl = 'http://localhost:5000'
)

Write-Host "Testing backend at $BaseUrl" -ForegroundColor Cyan

function Show-Response($resp) {
	if ($null -eq $resp) { Write-Host "<no response>" -ForegroundColor Red; return }
	try { $json = $resp | ConvertFrom-Json; $json | ConvertTo-Json -Depth 6 | Write-Host }
	catch { $resp | Out-String | Write-Host }
}

Write-Host "\n1) GET / (root)" -ForegroundColor Yellow
try {
	$r = Invoke-RestMethod -Uri "$BaseUrl/" -Method Get -ErrorAction Stop
	Show-Response $r
} catch { Write-Host "Error: $_" -ForegroundColor Red }

Write-Host "\n2) POST /api/ai/verify-upi (valid)" -ForegroundColor Yellow
try {
	$body = @{ upi = 'alice@upi'; gateway = 'googlepay' } | ConvertTo-Json
	$r = Invoke-RestMethod -Uri "$BaseUrl/api/ai/verify-upi" -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
	Show-Response $r
} catch { Write-Host "Error: $_" -ForegroundColor Red }

Write-Host "\n3) POST /api/ai/verify-upi (invalid)" -ForegroundColor Yellow
try {
	$body = @{ upi = 'invalid-upi' } | ConvertTo-Json
	$r = Invoke-RestMethod -Uri "$BaseUrl/api/ai/verify-upi" -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
	Show-Response $r
} catch { Write-Host "Error: $_" -ForegroundColor Red }

Write-Host "\n4) POST /api/ai/process-payment (mock)" -ForegroundColor Yellow
try {
	$body = @{ method = 'Card'; amount = '519'; details = @{ card = '**** **** **** 4242' } } | ConvertTo-Json -Depth 4
	$r = Invoke-RestMethod -Uri "$BaseUrl/api/ai/process-payment" -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
	Show-Response $r
} catch { Write-Host "Error: $_" -ForegroundColor Red }

Write-Host "\n5) POST /api/ai/chat" -ForegroundColor Yellow
try {
	$body = @{ message = 'hello' } | ConvertTo-Json
	$r = Invoke-RestMethod -Uri "$BaseUrl/api/ai/chat" -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
	Show-Response $r
} catch { Write-Host "Error: $_" -ForegroundColor Red }

Write-Host "\nAPI tests complete" -ForegroundColor Green
