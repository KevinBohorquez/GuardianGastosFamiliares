$body = '{"email":"diana.g4.leaderC@testmail.com","password":"Passw0rd!23"}'
$response = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
Write-Host "Status: $($response.StatusCode)"
Write-Host "Body: $($response.Content)"
