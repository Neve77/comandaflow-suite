param(
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\..\frontend\public\logo-icon.png')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$width = 1024
$height = 1024
$bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

$left = New-Object System.Drawing.Drawing2D.GraphicsPath
$left.AddLine(537, 219, 537, 389)
$left.AddBezier(537, 389, 527, 386, 519, 386, 510, 387)
$left.AddBezier(510, 387, 454, 392, 411, 439, 411, 496)
$left.AddBezier(411, 496, 411, 537, 435, 574, 472, 594)
$left.AddLine(472, 594, 472, 679)
$left.AddBezier(472, 679, 389, 663, 327, 587, 327, 496)
$left.AddBezier(327, 496, 327, 429, 357, 371, 401, 332)
$left.AddLine(401, 332, 537, 219)
$left.CloseFigure()

$right = New-Object System.Drawing.Drawing2D.GraphicsPath
$right.AddBezier(562, 313, 644, 335, 702, 409, 702, 496)
$right.AddBezier(702, 496, 702, 563, 670, 621, 622, 660)
$right.AddLine(622, 660, 496, 762)
$right.AddLine(496, 762, 496, 604)
$right.AddBezier(496, 604, 504, 605, 512, 605, 521, 604)
$right.AddBezier(521, 604, 578, 599, 621, 552, 621, 496)
$right.AddBezier(621, 496, 621, 458, 602, 424, 573, 405)
$right.AddLine(573, 405, 562, 463)
$right.AddLine(562, 463, 562, 313)
$right.CloseFigure()

$graphics.FillPath($brush, $left)
$graphics.FillPath($brush, $right)

$destination = [System.IO.Path]::GetFullPath($OutputPath)
$directory = [System.IO.Path]::GetDirectoryName($destination)
[System.IO.Directory]::CreateDirectory($directory) | Out-Null
$bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)

$right.Dispose()
$left.Dispose()
$brush.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output $destination
