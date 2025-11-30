param(
  [string]$Url = "http://localhost:9002",
  [int]$Requests = 10
)

Write-Output "`n== Entorno =="
Write-Output "Node: $(node -v)"
Write-Output "npm: $(npm -v)"
Write-Output "`n== Pruebas de peticiones a $Url =="

function Test-Requests {
  param($url, $count)
  $times = @()
  for ($i=1; $i -le $count; $i++) {
    try {
      $t = Measure-Command { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 | Out-Null }
      $ms = [math]::Round($t.TotalMilliseconds,2)
      Write-Output "Request ${i}: ${ms} ms"
      $times += $ms
    } catch {
      Write-Output "Request ${i}: ERROR - $($_.Exception.Message)"
      $times += [double]::NaN
    }
  }
  $valid = $times | Where-Object { -not ([double]::IsNaN($_)) }
  if ($valid.Count -eq 0) {
    Write-Output "No hubo respuestas válidas. Asegúrate de que el servidor esté corriendo en $url"
    return
  }
  $min = ($valid | Measure-Object -Minimum).Minimum
  $max = ($valid | Measure-Object -Maximum).Maximum
  $avg = [math]::Round(($valid | Measure-Object -Average).Average,2)
  Write-Output "`nResumen: min=${min} ms, avg=${avg} ms, max=${max} ms"
}

Test-Requests -url $Url -count $Requests

Write-Output "`n== Medir build (opcional) =="
Write-Output "Para medir el tiempo de build (puede tardar):"
Write-Output "Ejecuta en PowerShell: `$env:NODE_ENV='production'; npx next build"
