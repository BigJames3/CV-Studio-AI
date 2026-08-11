<#
.SYNOPSIS
  Test les endpoints de l'API CV Studio AI

.DESCRIPTION
  Aligne sur l'API NestJS reelle:
  - Register  POST /auth/register  (email, password, firstName, lastName)
  - Login     POST /auth/login
  - Profile   GET  /users/me
  - CRUD CVs  /cvs                 (title + content)

  Reponses wrappees: { success, data, meta }
  -> le token est dans data.accessToken

.EXAMPLE
  .\test-api.ps1

.EXAMPLE
  .\test-api.ps1 -Email "john@example.com" -Password "MyPass123!" -FirstName "John" -LastName "Doe"
#>

param(
    [string]$BaseUrl = "http://localhost:3001/api/v1",
    [string]$Email = "",
    [string]$Password = "Test123!",
    [string]$FirstName = "Test",
    [string]$LastName = "User"
)

# Email unique par run si non fourni (evite 409 Conflict)
if (-not $Email) {
    $Email = "test+$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))@example.com"
}

# ============================================================================
# SETUP
# ============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       CV Studio AI - API Test Suite" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host "Email:    $Email" -ForegroundColor Yellow
Write-Host ""

$global:accessToken = $null
$global:userId = $null
$global:results = [ordered]@{}

# ============================================================================
# FUNCTIONS
# ============================================================================

function Get-ErrorBody {
    param($ErrorRecord)
    try {
        if ($ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
            return $ErrorRecord.ErrorDetails.Message
        }
        $resp = $ErrorRecord.Exception.Response
        if ($resp) {
            $stream = $resp.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                return $reader.ReadToEnd()
            }
        }
    } catch {}
    return $null
}

function Unwrap-Data {
    param($Payload)
    if ($null -eq $Payload) { return $null }
    # API wraps payloads: { success, data, meta }
    if ($Payload.PSObject.Properties.Name -contains 'data') {
        return $Payload.data
    }
    return $Payload
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [switch]$SaveToken
    )

    Write-Host "------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Test: $Name" -ForegroundColor Cyan
    Write-Host "Method: $Method | Uri: $Uri" -ForegroundColor Gray

    try {
        $allHeaders = @{
            "Content-Type" = "application/json"
            "Accept"       = "application/json"
        }
        foreach ($k in $Headers.Keys) {
            $allHeaders[$k] = $Headers[$k]
        }

        $params = @{
            Uri             = $Uri
            Method          = $Method
            Headers         = $allHeaders
            UseBasicParsing = $true
            TimeoutSec      = 30
        }

        if ($Body) {
            $params["Body"] = $Body
            Write-Host "Body: $Body" -ForegroundColor Gray
        }

        $response = Invoke-WebRequest @params
        Write-Host "OK Status: $($response.StatusCode)" -ForegroundColor Green

        $payload = $null
        if ($response.Content) {
            $payload = $response.Content | ConvertFrom-Json
            Write-Host "Response:" -ForegroundColor Green
            ($payload | ConvertTo-Json -Depth 8) | Write-Host -ForegroundColor White
        }

        $data = Unwrap-Data $payload

        if ($SaveToken -and $data -and $data.accessToken) {
            $global:accessToken = [string]$data.accessToken
            $global:userId = [string]$data.user.id
            Write-Host ""
            Write-Host "Token saved (User: $($data.user.email))" -ForegroundColor Green
        }

        $global:results[$Name] = "PASS ($($response.StatusCode))"
        return $data
    }
    catch {
        $status = $null
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        $errBody = Get-ErrorBody $_

        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
        if ($status) {
            Write-Host "HTTP Status: $status" -ForegroundColor Red
        }
        if ($errBody) {
            Write-Host "Error Details:" -ForegroundColor Red
            Write-Host $errBody -ForegroundColor White
        }

        if ($SaveToken -and $status -eq 409) {
            $global:results[$Name] = "SKIP (409 already exists)"
            return @{ conflict = $true }
        }

        $global:results[$Name] = if ($status) { "FAIL ($status)" } else { "FAIL" }
        return $null
    }
}

# ============================================================================
# TESTS
# ============================================================================

# 0. Health
Write-Host ""
Write-Host "STEP 0: HEALTH" -ForegroundColor Magenta

$health = Test-Endpoint `
    -Name "Health Check" `
    -Method "GET" `
    -Uri "$BaseUrl/health"

if (-not $health) {
    Write-Host ""
    Write-Host "API unreachable. Start it with:" -ForegroundColor Yellow
    Write-Host "  pnpm docker:up" -ForegroundColor White
    Write-Host "  pnpm dev:api" -ForegroundColor White
    exit 1
}

# 1. Register (NOT /auth/signup)
Write-Host ""
Write-Host "STEP 1: REGISTER" -ForegroundColor Magenta

$registerBody = @{
    email     = $Email
    password  = $Password
    firstName = $FirstName
    lastName  = $LastName
} | ConvertTo-Json

$registerResult = Test-Endpoint `
    -Name "User Register" `
    -Method "POST" `
    -Uri "$BaseUrl/auth/register" `
    -Body $registerBody `
    -SaveToken

# 2. Login
Write-Host ""
Write-Host "STEP 2: LOGIN" -ForegroundColor Magenta

$loginBody = @{
    email    = $Email
    password = $Password
} | ConvertTo-Json

$loginResult = Test-Endpoint `
    -Name "User Login" `
    -Method "POST" `
    -Uri "$BaseUrl/auth/login" `
    -Body $loginBody `
    -SaveToken

if (-not $global:accessToken) {
    Write-Host ""
    Write-Host "Register/Login failed, cannot continue" -ForegroundColor Yellow
    exit 1
}

# IMPORTANT: $($global:accessToken) — pas "$global:accessToken"
$authHeaders = @{
    "Authorization" = "Bearer $($global:accessToken)"
}

# 3. Get Profile (NOT /auth/profile)
Write-Host ""
Write-Host "STEP 3: GET PROFILE" -ForegroundColor Magenta

$profileResult = Test-Endpoint `
    -Name "Get User Profile" `
    -Method "GET" `
    -Uri "$BaseUrl/users/me" `
    -Headers $authHeaders

# 4. Create CV (title, not name/description)
Write-Host ""
Write-Host "STEP 4: CREATE CV" -ForegroundColor Magenta

$cvBody = @{
    title  = "My First CV"
    locale = "fr-FR"
    content = @{
        schemaVersion = 1
        sections = @{
            identity     = @{ firstName = $FirstName; lastName = $LastName }
            summary      = @{ text = "I am a developer" }
            experiences  = @()
            education    = @()
            skills       = @()
            languages    = @()
            projects     = @()
            certificates = @()
        }
    }
} | ConvertTo-Json -Depth 10

$cvResult = Test-Endpoint `
    -Name "Create CV" `
    -Method "POST" `
    -Uri "$BaseUrl/cvs" `
    -Headers $authHeaders `
    -Body $cvBody

$cvId = $null
if ($cvResult -and $cvResult.id) {
    $cvId = [string]$cvResult.id
}

# 5. List CVs (& concatene hors string pour eviter parse PS)
Write-Host ""
Write-Host "STEP 5: LIST CVS" -ForegroundColor Magenta

$listUri = $BaseUrl + "/cvs?page=1" + "&limit=10"

$listResult = Test-Endpoint `
    -Name "List User CVs" `
    -Method "GET" `
    -Uri $listUri `
    -Headers $authHeaders

# 6. Get CV by ID
if ($cvId) {
    Write-Host ""
    Write-Host "STEP 6: GET CV BY ID" -ForegroundColor Magenta

    $getResult = Test-Endpoint `
        -Name "Get CV by ID" `
        -Method "GET" `
        -Uri "$BaseUrl/cvs/$cvId" `
        -Headers $authHeaders
}

# 7. Update CV (title, not name/description)
if ($cvId) {
    Write-Host ""
    Write-Host "STEP 7: UPDATE CV" -ForegroundColor Magenta

    $updateBody = @{
        title     = "My Updated CV"
        isStarred = $true
    } | ConvertTo-Json

    $updateResult = Test-Endpoint `
        -Name "Update CV" `
        -Method "PATCH" `
        -Uri "$BaseUrl/cvs/$cvId" `
        -Headers $authHeaders `
        -Body $updateBody
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$failed = 0
foreach ($key in $global:results.Keys) {
    $val = $global:results[$key]
    if ($val -like "PASS*") {
        $color = "Green"
    }
    elseif ($val -like "SKIP*") {
        $color = "Yellow"
    }
    else {
        $color = "Red"
        $failed++
    }
    Write-Host ("  {0,-22} {1}" -f $key, $val) -ForegroundColor $color
}

Write-Host ""
Write-Host "Stored Data:" -ForegroundColor Yellow
if ($global:accessToken) {
    $len = [Math]::Min(24, $global:accessToken.Length)
    $preview = $global:accessToken.Substring(0, $len)
    Write-Host "  Access Token: $preview..." -ForegroundColor White
}
Write-Host "  User ID: $($global:userId)" -ForegroundColor White
Write-Host "  CV ID:   $cvId" -ForegroundColor White
Write-Host "  Email:   $Email" -ForegroundColor White

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "$failed test(s) failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All critical tests passed." -ForegroundColor Green
exit 0
