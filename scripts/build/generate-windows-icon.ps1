param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\..\build\icon.ico')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = [System.IO.Path]::GetFullPath($SourcePath)
$destination = [System.IO.Path]::GetFullPath($OutputPath)

if (-not [System.IO.File]::Exists($source)) {
  throw "Source image not found: $source"
}

$destinationDirectory = [System.IO.Path]::GetDirectoryName($destination)
[System.IO.Directory]::CreateDirectory($destinationDirectory) | Out-Null

$sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256)
$images = New-Object System.Collections.Generic.List[object]
$sourceImage = [System.Drawing.Image]::FromFile($source)

try {
  foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = New-Object System.IO.MemoryStream

    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
      $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
      $images.Add([pscustomobject]@{ Size = $size; Bytes = $stream.ToArray() })
    } finally {
      $stream.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}

$fileStream = [System.IO.File]::Open($destination, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($fileStream)

try {
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]$images.Count)

  $offset = 6 + (16 * $images.Count)
  foreach ($image in $images) {
    $dimension = if ($image.Size -ge 256) { 0 } else { $image.Size }
    $writer.Write([byte]$dimension)
    $writer.Write([byte]$dimension)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$image.Bytes.Length)
    $writer.Write([uint32]$offset)
    $offset += $image.Bytes.Length
  }

  foreach ($image in $images) {
    $writer.Write([byte[]]$image.Bytes)
  }
} finally {
  $writer.Dispose()
  $fileStream.Dispose()
}

Write-Output $destination
