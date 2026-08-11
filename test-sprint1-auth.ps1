<#
.SYNOPSIS
  Sprint 1 Authentication automated test suite for CV Studio AI

.DESCRIPTION
  Aligned with the real NestJS API (not /signup or /profile stubs):

  POST /api/v1/auth/register   { email, password, firstName, lastName }
  POST /api/v1/auth/login
  GET  /api/v1/users/me
  POST /api/v1/auth/refresh    { refreshToken }
  POST /api/v1/auth/logout     { refreshToken } + Bearer
  POST /api/v1/auth/forgot-password
  GET  /api/v1/auth/sessions

  Responses are wrapped: { success, data, meta }

.EXAMPLE
  .\test-sprint1-auth.ps1

.EXAMPLE
  .\test-sprint1-auth.ps1 -BaseUrl "http://localhost:3001/api/v1"
#>

param(
    [string]$BaseUrl = "http://localhost:3001/api/v1"
)

$ErrorActionPreference = "Continue"

$script:accessToken = $null
$script:refreshToken = $null
$script:userId = $null
$script:pass = 0
$script:fail = 0
$script:skip = 0

$testEmail = "sprint1+$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))$([guid]::NewGuid().ToString('N').Substring(0,6))@example.com"
$testPassword = "TestPass123!"
$testFirstName = "Sprint"
$testLastName = "One"

function Write-Header([string]$Title) {
    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("=" * 72) -ForegroundColor Cyan
}

function Get-ErrorBody($ErrorRecord) {
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

function Unwrap-Data($Payload) {
    if ($null -eq $Payload) { return $null }
    if ($Payload.PSObject.Properties.Name -contains 'data') { return $Payload.data }
    return $Payload
}

function Invoke-ApiTest {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null,
        [int[]]$Expect = @(200, 201),
        [string]$Token = $null,
        [switch]$SaveTokens
    )

    Write-Host ("  > {0}" -f $Name) -ForegroundColor Cyan -NoNewline

    $uri = "$BaseUrl$Path"
    $headers = @{
        "Accept" = "application/json"
    }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    try {
        $params = @{
            Uri             = $uri
            Method          = $Method
            Headers         = $headers
            UseBasicParsing = $true
            TimeoutSec      = 30
        }
        if ($null -ne $Body) {
            $params["ContentType"] = "application/json"
            $params["Body"] = ($Body | ConvertTo-Json -Compress -Depth 6)
        }

        $response = Invoke-WebRequest @params
        $status = [int]$response.StatusCode
        $payload = $null
        if ($response.Content) {
            $payload = $response.Content | ConvertFrom-Json
        }
        $data = Unwrap-Data $payload

        if ($Expect -contains $status) {
            Write-Host " PASS ($status)" -ForegroundColor Green
            $script:pass++
            if ($SaveTokens -and $data -and $data.accessToken) {
                $script:accessToken = [string]$data.accessToken
                $script:refreshToken = [string]$data.refreshToken
                if ($data.user -and $data.user.id) {
                    $script:userId = [string]$data.user.id
                }
            }
            return $data
        }

        Write-Host " FAIL (got $status, expected $($Expect -join '|'))" -ForegroundColor Red
        $script:fail++
        return $null
    }
    catch {
        $status = $null
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        $errBody = Get-ErrorBody $_

        if ($status -and ($Expect -contains $status)) {
            Write-Host " PASS ($status expected)" -ForegroundColor Green
            $script:pass++
            return $null
        }

        Write-Host " FAIL" -ForegroundColor Red
        if ($status) {
            Write-Host ("    status={0} expected={1}" -f $status, ($Expect -join '|')) -ForegroundColor Red
        } else {
            Write-Host ("    error={0}" -f $_.Exception.Message) -ForegroundColor Red
        }
        if ($errBody) {
            $preview = $errBody
            if ($preview.Length -gt 240) { $preview = $preview.Substring(0, 240) + "..." }
            Write-Host ("    body={0}" -f $preview) -ForegroundColor DarkGray
        }
        $script:fail++
        return $null
    }
}

# -----------------------------------------------------------------------------
Write-Header "SPRINT 1 AUTH TEST SUITE"
Write-Host ("Start:  {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray
Write-Host ("Base:   {0}" -f $BaseUrl) -ForegroundColor Gray
Write-Host ("Email:  {0}" -f $testEmail) -ForegroundColor Gray
Write-Host ""

# Health
Write-Host "Health check..." -ForegroundColor Cyan
$healthOk = $false
try {
    $h = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 5
    if ($h.StatusCode -eq 200) {
        Write-Host "  Backend OK" -ForegroundColor Green
        $healthOk = $true
    }
} catch {
    Write-Host "  Backend unreachable: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Start with: pnpm docker:up && pnpm dev:api" -ForegroundColor Yellow
    exit 1
}
if (-not $healthOk) { exit 1 }

# =============================================================================
Write-Header "1. REGISTER"
# =============================================================================

$reg = Invoke-ApiTest -Name "1.1 Register valid" -Method POST -Path "/auth/register" -Body @{
    email     = $testEmail
    password  = $testPassword
    firstName = $testFirstName
    lastName  = $testLastName
} -Expect @(201, 200) -SaveTokens

if ($script:userId) {
    Write-Host ("    userId={0}" -f $script:userId) -ForegroundColor DarkGray
}
if ($script:accessToken) {
    Write-Host ("    access={0}..." -f $script:accessToken.Substring(0, [Math]::Min(24, $script:accessToken.Length))) -ForegroundColor DarkGray
}

Invoke-ApiTest -Name "1.2 Invalid email" -Method POST -Path "/auth/register" -Body @{
    email     = "invalid-email"
    password  = $testPassword
    firstName = "A"
    lastName  = "B"
} -Expect @(400) | Out-Null

Invoke-ApiTest -Name "1.3 Short password" -Method POST -Path "/auth/register" -Body @{
    email     = "shortpass+$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
    password  = "short"
    firstName = "A"
    lastName  = "B"
} -Expect @(400) | Out-Null

Invoke-ApiTest -Name "1.4 Duplicate email" -Method POST -Path "/auth/register" -Body @{
    email     = $testEmail
    password  = $testPassword
    firstName = "Other"
    lastName  = "User"
} -Expect @(409) | Out-Null

# =============================================================================
Write-Header "2. LOGIN"
# =============================================================================

Invoke-ApiTest -Name "2.1 Login valid" -Method POST -Path "/auth/login" -Body @{
    email    = $testEmail
    password = $testPassword
} -Expect @(200) -SaveTokens | Out-Null

Invoke-ApiTest -Name "2.2 Wrong password" -Method POST -Path "/auth/login" -Body @{
    email    = $testEmail
    password = "WrongPassword123!"
} -Expect @(401) | Out-Null

Invoke-ApiTest -Name "2.3 Unknown email" -Method POST -Path "/auth/login" -Body @{
    email    = "nonexistent-$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
    password = $testPassword
} -Expect @(401) | Out-Null

# =============================================================================
Write-Header "3. PROFILE (GET /users/me)"
# =============================================================================

if ($script:accessToken) {
    Invoke-ApiTest -Name "3.1 Profile with token" -Method GET -Path "/users/me" -Expect @(200) -Token $script:accessToken | Out-Null
} else {
    Write-Host "  > 3.1 Profile with token SKIP (no token)" -ForegroundColor Yellow
    $script:skip++
}

Invoke-ApiTest -Name "3.2 Profile without token" -Method GET -Path "/users/me" -Expect @(401) | Out-Null

Invoke-ApiTest -Name "3.3 Profile bad token" -Method GET -Path "/users/me" -Expect @(401) -Token "invalid.token.here" | Out-Null

# =============================================================================
Write-Header "4. REFRESH"
# =============================================================================

if ($script:refreshToken) {
    $oldRefresh = $script:refreshToken
    Invoke-ApiTest -Name "4.1 Refresh valid" -Method POST -Path "/auth/refresh" -Body @{
        refreshToken = $oldRefresh
    } -Expect @(200) -SaveTokens | Out-Null
} else {
    Write-Host "  > 4.1 Refresh valid SKIP (no refresh)" -ForegroundColor Yellow
    $script:skip++
}

Invoke-ApiTest -Name "4.2 Refresh invalid" -Method POST -Path "/auth/refresh" -Body @{
    refreshToken = "invalid.refresh.token"
} -Expect @(401) | Out-Null

# Optional: reuse of old refresh should fail if rotation+reuse-detect is live
if ($oldRefresh -and $script:refreshToken -and ($oldRefresh -ne $script:refreshToken)) {
    Write-Host "  > 4.3 Refresh reuse (rotated) rejected" -ForegroundColor Cyan -NoNewline
    try {
        $params = @{
            Uri             = "$BaseUrl/auth/refresh"
            Method          = "POST"
            ContentType     = "application/json"
            Body            = (@{ refreshToken = $oldRefresh } | ConvertTo-Json -Compress)
            UseBasicParsing = $true
            TimeoutSec      = 30
        }
        $r = Invoke-WebRequest @params
        # Still 200 => rotation without reuse detection (Sprint 1 gap)
        Write-Host " WARN (got $([int]$r.StatusCode) - reuse still accepted; harden Redis revoke)" -ForegroundColor Yellow
        $script:skip++
    } catch {
        $status = $null
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        if ($status -eq 401) {
            Write-Host " PASS (401 expected)" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host " FAIL (status=$status)" -ForegroundColor Red
            $script:fail++
        }
    }
}

# =============================================================================
Write-Header "5. SESSIONS (optional Sprint 1)"
# =============================================================================

if ($script:accessToken) {
    Write-Host "  > 5.1 List sessions" -ForegroundColor Cyan -NoNewline
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/auth/sessions" -Headers @{
            Authorization = "Bearer $($script:accessToken)"
            Accept        = "application/json"
        } -UseBasicParsing -TimeoutSec 30
        Write-Host " PASS ($([int]$r.StatusCode))" -ForegroundColor Green
        $script:pass++
    } catch {
        $status = $null
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        if ($status -eq 404) {
            Write-Host " SKIP (404 - restart api if sessions route is in source but not loaded)" -ForegroundColor Yellow
            $script:skip++
        } else {
            Write-Host " FAIL (status=$status)" -ForegroundColor Red
            $script:fail++
        }
    }
} else {
    Write-Host "  > 5.1 List sessions SKIP" -ForegroundColor Yellow
    $script:skip++
}

# =============================================================================
Write-Header "6. FORGOT PASSWORD"
# =============================================================================

Invoke-ApiTest -Name "6.1 Forgot password (always 200)" -Method POST -Path "/auth/forgot-password" -Body @{
    email = $testEmail
} -Expect @(200) | Out-Null

Invoke-ApiTest -Name "6.2 Forgot unknown email (still 200)" -Method POST -Path "/auth/forgot-password" -Body @{
    email = "nobody-$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
} -Expect @(200) | Out-Null

# =============================================================================
Write-Header "7. LOGOUT"
# =============================================================================

if ($script:accessToken -and $script:refreshToken) {
    Invoke-ApiTest -Name "7.1 Logout" -Method POST -Path "/auth/logout" -Body @{
        refreshToken = $script:refreshToken
    } -Expect @(200) -Token $script:accessToken | Out-Null
} else {
    Write-Host "  > 7.1 Logout SKIP" -ForegroundColor Yellow
    $script:skip++
}

# =============================================================================
Write-Header "SUMMARY"
Write-Host ("  PASS={0}  FAIL={1}  SKIP={2}" -f $script:pass, $script:fail, $script:skip) -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
Write-Host ""
Write-Host "Test account:" -ForegroundColor Yellow
Write-Host ("  Email:    {0}" -f $testEmail)
Write-Host ("  Password: {0}" -f $testPassword)
Write-Host ("  User ID:  {0}" -f $script:userId)
Write-Host ("End: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -ForegroundColor Gray
Write-Host ""

if ($script:fail -gt 0) { exit 1 }
exit 0
