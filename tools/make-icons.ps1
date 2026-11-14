# Lager PNG-ikonene i icons/ (kjør på nytt hvis ikonet skal endres):
#   powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
# Ikonene er helt fylt (ingen gjennomsiktighet), slik iOS krever for apple-touch-icon.
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

function New-Icon([int]$size, [string]$name) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    $c1 = [System.Drawing.Color]::FromArgb(255, 255, 45, 85)
    $c2 = [System.Drawing.Color]::FromArgb(255, 255, 122, 61)
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45.0
    $g.FillRectangle($bg, $rect)

    $r = $size * 0.25
    $w = $size * 0.086
    $ring = New-Object System.Drawing.RectangleF ($size / 2 - $r), ($size / 2 - $r), ($r * 2), ($r * 2)

    $faint = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(72, 255, 255, 255)), $w
    $g.DrawEllipse($faint, $ring)

    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $w
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($pen, $ring, -90, 270)

    $d = $size * 0.156
    $g.FillEllipse([System.Drawing.Brushes]::White, ($size / 2 - $d / 2), ($size / 2 - $d / 2), $d, $d)

    $g.Dispose()
    $bmp.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

New-Icon 180 'apple-touch-icon.png'
New-Icon 192 'icon-192.png'
New-Icon 512 'icon-512.png'
Write-Output "Ikoner skrevet til $outDir"
