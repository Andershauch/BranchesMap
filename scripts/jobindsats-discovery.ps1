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

  $envValue = [System.Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return $envValue.Trim()
  }

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
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers @{ Authorization = "Bearer $Token"; Accept = "application/json" }
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
$baseUrl = "https://api.jobindsats.dk/v3"
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
    $result = Invoke-JobindsatsRequest -Uri "$baseUrl/subjects?format=json" -Token $token
    $outputPath = Resolve-OutputPath -DefaultName "subjects"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved subjects to $outputPath"
  }

  "tables" {
    $result = Invoke-JobindsatsRequest -Uri "$baseUrl/tables?format=json" -Token $token

    if ($Query) {
      $needle = $Query.ToLowerInvariant()
      $tables = foreach ($subject in @($result)) {
        foreach ($tableGroup in @($subject.table_groups)) {
          foreach ($table in @($tableGroup.tables)) {
            [PSCustomObject]@{
              table_id = $table.table_id
              table_name = $table.table_name
              table_group_name = $tableGroup.table_group_name
              subject_name = $subject.subject_name
            }
          }
        }
      }
      $result = @($tables | Where-Object {
        ($_.table_id -and $_.table_id.ToLowerInvariant().Contains($needle)) -or
        ($_.table_name -and $_.table_name.ToLowerInvariant().Contains($needle)) -or
        ($_.table_group_name -and $_.table_group_name.ToLowerInvariant().Contains($needle)) -or
        ($_.subject_name -and $_.subject_name.ToLowerInvariant().Contains($needle))
      })
    }

    $outputPath = Resolve-OutputPath -DefaultName "tables"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved tables to $outputPath"
  }

  "table" {
    if (-not $TableId) {
      throw "TableId is required when Mode=table."
    }

    $safeTableId = [System.Uri]::EscapeDataString($TableId.Trim().ToLowerInvariant())
    $result = Invoke-JobindsatsRequest -Uri "$baseUrl/table/$safeTableId`?format=json" -Token $token
    $outputPath = Resolve-OutputPath -DefaultName "table-$TableId"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved table detail to $outputPath"
  }

  "data" {
    if (-not $TableId) {
      throw "TableId is required when Mode=data."
    }

    $safeTableId = [System.Uri]::EscapeDataString($TableId.Trim().ToLowerInvariant())
    $metadataCachePath = Join-Path $resolvedOutputDir ".metadata-$safeTableId-v3.json"
    if ((Test-Path $metadataCachePath) -and ((Get-Item $metadataCachePath).LastWriteTimeUtc -gt [DateTime]::UtcNow.AddHours(-24))) {
      $metadata = Get-Content -Raw -Encoding UTF8 $metadataCachePath | ConvertFrom-Json
    } else {
      $metadata = Invoke-JobindsatsRequest -Uri "$baseUrl/table/$safeTableId`?format=json" -Token $token
      Convert-ToUtf8Json -InputObject $metadata -Path $metadataCachePath
    }
    $areaDimension = $metadata.dimensions | Where-Object { $_.dimension_id -eq "_omrade" } | Select-Object -First 1
    $municipalityHierarchy = $areaDimension.hierarchies | Where-Object { $_.hierarchy_id -eq "_nykom" } | Select-Object -First 1
    $areaValues = $municipalityHierarchy.levels | ForEach-Object { $_.values } | Where-Object { $_.value_name -eq $Area }
    if (-not $areaValues) {
      throw "Municipality '$Area' was not found in Jobindsats v3 metadata."
    }
    if ($Esco -eq "*") {
      $escoValue = "*"
    } else {
      $escoDimension = $metadata.dimensions | Where-Object { $_.dimension_id -eq "_esco_uri" } | Select-Object -First 1
      $escoValues = $escoDimension.hierarchies | ForEach-Object { $_.levels } | ForEach-Object { $_.values }
      $escoValue = ($escoValues | Where-Object { $_.value_name -eq $Esco } | Select-Object -First 1).value_id
      if (-not $escoValue) { throw "Stillingsbetegnelse '$Esco' was not found in Jobindsats v3 metadata." }
    }
    $areaValue = [System.Uri]::EscapeDataString($areaValues[0].value_id)
    $escoValue = [System.Uri]::EscapeDataString($escoValue)
    $periodValue = [System.Uri]::EscapeDataString($Period)
    $uri = "$baseUrl/data/$safeTableId`?mgroup.*=*&period.M=$periodValue&hierarchy._nykom=$areaValue&hierarchy._esco_uri=$escoValue&format=json"
    $result = Invoke-JobindsatsRequest -Uri $uri -Token $token
    $outputPath = Resolve-OutputPath -DefaultName "data-$TableId"
    Convert-ToUtf8Json -InputObject $result -Path $outputPath
    Write-Host "Saved table data to $outputPath"
  }
}

if ($OpenOutput) {
  Invoke-Item $resolvedOutputDir
}
