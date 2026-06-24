# Verificar FAM-CP-014: Obtener la membresía de Ana en Familia_C_G4 y llamar al DELETE
# primero obtenemos el token de Ana
$loginBody = '{"email":"ana.g4.leader1@testmail.com","password":"Passw0rd!23"}'
$loginResp = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$loginData = $loginResp.Content | ConvertFrom-Json
$token = $loginData.accessToken
Write-Host "Token de Ana obtenido: $($token.Substring(0, 30))..."

# Obtener memberFamilies para buscar el membershipId
$famResp = Invoke-WebRequest -Uri "http://localhost:4000/api/family/memberships" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "Memberships: $($famResp.Content)"

$mems = $famResp.Content | ConvertFrom-Json
if ($mems.Count -eq 0) {
  Write-Host "No hay memberships - quizas ya abandono o el seed no se ejecuto"
  exit 0
}
$memId = $mems[0].membershipId
Write-Host "membershipId de Ana en Familia_C_G4: $memId"

# Llamar DELETE para abandonar
$delResp = Invoke-WebRequest -Uri "http://localhost:4000/api/family/invite/$memId" -Method DELETE -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "Status abandono: $($delResp.StatusCode)"
Write-Host "Body abandono: $($delResp.Content)"

# Verificar que Ana sigue siendo lider
$leaderResp = Invoke-WebRequest -Uri "http://localhost:4000/api/family/me" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "Familia de Ana como lider: $($leaderResp.Content)"
