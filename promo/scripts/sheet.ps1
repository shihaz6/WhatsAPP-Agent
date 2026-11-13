# Combines out/stills/*.png into contact sheets for a quick visual check.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\sheet.ps1
Add-Type -AssemblyName System.Drawing
$dir = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "out\stills"

function Sheet($pattern, $cols, $tw, $th, $out) {
  $files = Get-ChildItem (Join-Path $dir $pattern) | Sort-Object { [int]($_.BaseName -split '-')[-1] }
  if (-not $files) { return }
  $rows = [math]::Ceiling($files.Count / $cols)
  $bmp = New-Object System.Drawing.Bitmap ([int]($cols * $tw)), ([int]($rows * $th))
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::Black)
  $font = New-Object System.Drawing.Font "Arial", 16, ([System.Drawing.FontStyle]::Bold)
  for ($i = 0; $i -lt $files.Count; $i++) {
    $img = [System.Drawing.Image]::FromFile($files[$i].FullName)
    $x = ($i % $cols) * $tw; $y = [math]::Floor($i / $cols) * $th
    $g.DrawImage($img, $x, $y, $tw - 4, $th - 4); $img.Dispose()
    $g.DrawString(($files[$i].BaseName -split '-')[-1], $font, [System.Drawing.Brushes]::Yellow, $x + 6, $y + 4)
  }
  $bmp.Save((Join-Path $dir $out)); $g.Dispose(); $bmp.Dispose()
  Write-Host (Join-Path $dir $out)
}
Sheet "Promo-Landscape-*.png" 3 640 360 "sheet-landscape.png"
Sheet "Promo-Portrait-*.png" 7 280 498 "sheet-portrait.png"
