param(
  [ValidateSet("subjects", "tables", "table", "data")]
  [string]$Mode = "subjects",

  [string]$TableId = "",

  [string]$Query = "",

  [string]$Area = "Hele landet",

  [string]$Period = "l(m:12)",

  [string]$Esco = "Stillingsbetegnelse i alt",

  [string]$OutputName = "",

  [string]$OutputDir = "_tmp_jobindsats",

  [switch]$OpenOutput
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$Name
  )

  $envFile = Join-Path (Get-Location) ".env"

  if (-not (Test-Path $envFile)) {
    throw ".env not found in current workspace."
  }

  $line = Get-Content $envFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) {
    throw "$Name not found in .env."
  }

  return ($line -replace "^$Name=", "").Trim().Trim('"')
}

function Parse-JobindsatsJson {
  param(
    [string]$Raw
  )

  if ([string]::IsNullOrWhiteSpace($Raw)) {
    throw "Jobindsats returned an empty response body."
  }

  $clean = $Raw.Trim()

  if ($clean.Length -gt 0 -and [int][char]$clean[0] -eq 0xFEFF) {
    $clean = $clean.Substring(1)
  }

  if (
    $clean.Length -ge 3 -and
    [int][char]$clean[0] -eq 0x00EF -and
    [int][char]$clean[1] -eq 0x00BB -and
    [int][char]$clean[2] -eq 0x00BF
  ) {
    $clean = $clean.Substring(3)
  }

  try {
    return $clean | ConvertFrom-Json
  }
  catch {
    $previewLength = [Math]::Min(180, $clean.Length)
    $preview = $clean.Substring(0, $previewLength)
    throw "Could not parse Jobindsats JSON. Preview: $preview"
  }
}

function Invoke-JobindsatsRequest {
  param(
    [string]$Uri,
    [string]$Token
  )

  Write-Host "GET $Uri"
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers @{ Authorization = $Token }
  return Parse-JobindsatsJson -Raw $response.Content
}

function Convert-ToUtf8Json {
  param(
    $InputObject,
    [string]$Path
  )

  $json = $InputObject | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function Ensure-OutputDir {
  param(
    [string]$Path
  )

  New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Resolve-OutputPath {
  param(
    [string]$DefaultName
  )

  $name = if ($OutputName) { $OutputName } else { $DefaultName }
  return Join-Path $resolvedOutputDir ($name + ".json")
}

$token = Get-EnvValue -Name "JOBINDSATS_API_TOKEN"
$baseUrl = "https://api.jobindsats.dk/v2"
$resolvedOutputDir = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
  $OutputDir
} else {
  Join-Path (Get-Location) $OutputDir
}
$encodedArea = [System.Uri]::EscapeDataString($Area)
$encodedPeriod = [System.Uri]::EscapeDataString($Period)
$encodedEsco = [System.Uri]::EscapeDataString($Esco)

Ensure-OutputDir -Path $resolvedOutputDir

switch ($Mode) {
  "subjects" {
    $result = Invoke-JobindsatsRequest -Uri "$baseUrl/subjects/json" -Token $token
    $outputPath = Resolve-OutputPath -DefaultName "subjects"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved subjects to $outputPath"
  }

  "tables" {
    $result = Invoke-JobindsatsRequest -Uri "$baseUrl/tables" -Token $token

    if ($Query) {
      $needle = $Query.ToLowerInvariant()
      $result = $result | Where-Object {
        ($_.TableName -and $_.TableName.ToLowerInvariant().Contains($needle)) -or
        ($_.SubjectName -and $_.SubjectName.ToLowerInvariant().Contains($needle))
      }
    }

    $outputPath = Resolve-OutputPath -DefaultName "tables"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved tables to $outputPath"
  }

  "table" {
    if (-not $TableId) {
      throw "TableId is required when Mode=table."
    }

    $result = Invoke-JobindsatsRequest -Uri "$baseUrl/tables/$TableId/json" -Token $token
    $outputPath = Resolve-OutputPath -DefaultName "table-$TableId"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved table detail to $outputPath"
  }

  "data" {
    if (-not $TableId) {
      throw "TableId is required when Mode=data."
    }

    $uri = "$baseUrl/data/$TableId/json/?period=$encodedPeriod&area=$encodedArea&_esco_uri=$encodedEsco"
    $result = Invoke-JobindsatsRequest -Uri $uri -Token $token
    $outputPath = Resolve-OutputPath -DefaultName "data-$TableId"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved table data to $outputPath"
  }
}

if ($OpenOutput) {
  Invoke-Item $resolvedOutputDir
}
