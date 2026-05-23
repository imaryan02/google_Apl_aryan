param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "asia-south1",
  [string]$BackendService = "stadium-backend"
)

$ErrorActionPreference = "Stop"

function Read-DotEnv($Path) {
  $values = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
    $values[$key] = $value
  }
  return $values
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud is not installed or not on PATH. Install Google Cloud CLI, then rerun this script."
}

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
  throw "firebase CLI is not installed or not on PATH. Run: npm install -g firebase-tools"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$envFile = Join-Path $backendDir ".env"

if (-not (Test-Path $envFile)) {
  throw "Missing backend\.env. It must contain DATABASE_URL and GEMINI_API_KEY."
}

$envValues = Read-DotEnv $envFile
if (-not $envValues.ContainsKey("DATABASE_URL")) {
  throw "backend\.env is missing DATABASE_URL."
}

gcloud config set project $ProjectId
gcloud config set run/region $Region
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

$envArgs = "DATABASE_URL=$($envValues["DATABASE_URL"])"
if ($envValues.ContainsKey("GEMINI_API_KEY") -and $envValues["GEMINI_API_KEY"]) {
  $envArgs = "$envArgs,GEMINI_API_KEY=$($envValues["GEMINI_API_KEY"])"
}

Push-Location $backendDir
try {
  gcloud run deploy $BackendService --source . --region $Region --allow-unauthenticated --port 8000 --set-env-vars $envArgs
  $backendUrl = gcloud run services describe $BackendService --region $Region --format "value(status.url)"
}
finally {
  Pop-Location
}

if (-not $backendUrl) {
  throw "Cloud Run deploy finished but backend URL could not be read."
}

Write-Host "Backend URL: $backendUrl"

Push-Location $frontendDir
try {
  $env:VITE_API_BASE_URL = $backendUrl
  npm run build
}
finally {
  Pop-Location
}

firebase deploy --only hosting --project $ProjectId

Write-Host "Deploy complete."
