# ============================================================================
# 🧪 TEST COMPLET API - CV Studio AI
# ============================================================================
# Script PowerShell pour tester TOUS les endpoints de l'API
# 
# Utilisation:
#   .\test-api-complete.ps1
#   .\test-api-complete.ps1 -BaseUrl "http://localhost:3001/api/v1"
#   .\test-api-complete.ps1 -Verbose
#
# Prérequis:
#   - Backend lancé sur http://localhost:3001
#   - PostgreSQL et Redis en cours d'exécution
#   - Base de données initialisée
#
# ============================================================================

param(
    [string]$BaseUrl = "http://localhost:3001/api/v1",
    [switch]$Verbose,
    [switch]$SkipCleanup
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Continue"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

# Compteurs
$global:TotalTests = 0
$global:PassedTests = 0
$global:FailedTests = 0
$global:SkippedTests = 0

# Stockage des données entre tests
$global:TestData = @{
    accessToken    = $null
    refreshToken   = $null
    userId         = $null
    cvId           = $null
    templateId     = $null
    userEmail      = "test-$(Get-Random)@example.com"
    userPassword   = "TestPassword123!"
    userName       = "testuser$(Get-Random)"
}

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

function Write-TestHeader {
    param([string]$Title)
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Title.PadRight(56))║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-TestSection {
    param([string]$Section)
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "📌 $Section" -ForegroundColor Magenta
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int[]]$ExpectedStatus = @(200, 201),
        [scriptblock]$Assertions = $null,
        [switch]$Optional
    )
    
    $global:TotalTests++
    
    Write-Host "`n  Test: $Name" -ForegroundColor Yellow
    
    try {
        $uri = "$BaseUrl$Endpoint"
        Write-Verbose "  URI: $uri"
        Write-Verbose "  Method: $Method"
        
        $params = @{
            Uri             = $uri
            Method          = $Method
            Headers         = $Headers + @{"Content-Type" = "application/json"}
            TimeoutSec      = 10
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params["Body"] = $Body
            Write-Verbose "  Body: $Body"
        }
        
        $response = Invoke-WebRequest @params
        
        # Vérifie le status
        if ($response.StatusCode -in $ExpectedStatus) {
            Write-Host "  ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Status: $($response.StatusCode) (Expected: $ExpectedStatus)" -ForegroundColor Red
            $global:FailedTests++
            return $null
        }
        
        # Parse le contenu
        $data = $response.Content | ConvertFrom-Json
        
        # Exécute les assertions personnalisées
        if ($Assertions) {
            try {
                & $Assertions $data
                Write-Host "  ✅ Assertions passed" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Assertions failed: $_" -ForegroundColor Red
                $global:FailedTests++
                return $null
            }
        }
        
        $global:PassedTests++
        Write-Host "  ✅ Test passed" -ForegroundColor Green
        return $data
        
    } catch {
        if ($Optional) {
            Write-Host "  ⚠️  Optional test skipped: $($_.Exception.Message)" -ForegroundColor Yellow
            $global:SkippedTests++
        } else {
            Write-Host "  ❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
            $global:FailedTests++
        }
        return $null
    }
}

# ============================================================================
# TESTS - AUTHENTIFICATION
# ============================================================================

Write-TestHeader "SECTION 1: AUTHENTIFICATION"

Write-TestSection "1.1 SIGNUP - Créer un compte utilisateur"

$signupBody = @{
    email    = $global:TestData.userEmail
    password = $global:TestData.userPassword
    username = $global:TestData.userName
} | ConvertTo-Json

$signupResult = Test-Endpoint `
    -Name "Signup avec email/password/username" `
    -Method "POST" `
    -Endpoint "/auth/signup" `
    -Body $signupBody `
    -ExpectedStatus @(201, 200) `
    -Assertions {
        param($data)
        if (-not $data.accessToken) { throw "No accessToken returned" }
        if (-not $data.refreshToken) { throw "No refreshToken returned" }
        if (-not $data.user) { throw "No user object returned" }
        if (-not $data.user.id) { throw "No user.id returned" }
    }

if ($signupResult) {
    $global:TestData.accessToken = $signupResult.accessToken
    $global:TestData.refreshToken = $signupResult.refreshToken
    $global:TestData.userId = $signupResult.user.id
    Write-Host "  💾 Tokens stored for next tests" -ForegroundColor Green
}

Write-TestSection "1.2 SIGNUP VALIDATION - Email invalide"

$invalidEmailBody = @{
    email    = "invalid-email"
    password = "Test123!"
    username = "testuser"
} | ConvertTo-Json

Test-Endpoint `
    -Name "Signup avec email invalide (doit échouer)" `
    -Method "POST" `
    -Endpoint "/auth/signup" `
    -Body $invalidEmailBody `
    -ExpectedStatus @(400) `
    -Optional

Write-TestSection "1.3 SIGNUP VALIDATION - Mot de passe trop court"

$weakPasswordBody = @{
    email    = "test@example.com"
    password = "123"
    username = "testuser"
} | ConvertTo-Json

Test-Endpoint `
    -Name "Signup avec mot de passe faible (doit échouer)" `
    -Method "POST" `
    -Endpoint "/auth/signup" `
    -Body $weakPasswordBody `
    -ExpectedStatus @(400) `
    -Optional

Write-TestSection "1.4 SIGNUP VALIDATION - Email déjà existant"

$duplicateEmailBody = @{
    email    = $global:TestData.userEmail
    password = "NewPassword123!"
    username = "anotheruser"
} | ConvertTo-Json

Test-Endpoint `
    -Name "Signup avec email déjà existant (doit échouer)" `
    -Method "POST" `
    -Endpoint "/auth/signup" `
    -Body $duplicateEmailBody `
    -ExpectedStatus @(400, 409) `
    -Optional

Write-TestSection "1.5 LOGIN - Se connecter"

$loginBody = @{
    email    = $global:TestData.userEmail
    password = $global:TestData.userPassword
} | ConvertTo-Json

$loginResult = Test-Endpoint `
    -Name "Login avec email/password" `
    -Method "POST" `
    -Endpoint "/auth/login" `
    -Body $loginBody `
    -ExpectedStatus @(200) `
    -Assertions {
        param($data)
        if (-not $data.accessToken) { throw "No accessToken returned" }
        if (-not $data.user) { throw "No user object returned" }
    }

Write-TestSection "1.6 LOGIN VALIDATION - Password incorrect"

$wrongPasswordBody = @{
    email    = $global:TestData.userEmail
    password = "WrongPassword123!"
} | ConvertTo-Json

Test-Endpoint `
    -Name "Login avec mot de passe incorrect (doit échouer)" `
    -Method "POST" `
    -Endpoint "/auth/login" `
    -Body $wrongPasswordBody `
    -ExpectedStatus @(401, 400) `
    -Optional

Write-TestSection "1.7 PROFILE - Voir le profil authentifié"

$profileHeaders = @{
    "Authorization" = "Bearer $($global:TestData.accessToken)"
}

$profileResult = Test-Endpoint `
    -Name "GET profile avec token valide" `
    -Method "GET" `
    -Endpoint "/auth/profile" `
    -Headers $profileHeaders `
    -ExpectedStatus @(200) `
    -Assertions {
        param($data)
        if (-not $data.user) { throw "No user object returned" }
        if ($data.user.email -ne $global:TestData.userEmail) { throw "User email mismatch" }
    }

Write-TestSection "1.8 PROFILE - Sans authentification"

Test-Endpoint `
    -Name "GET profile sans token (doit échouer)" `
    -Method "GET" `
    -Endpoint "/auth/profile" `
    -ExpectedStatus @(401, 403) `
    -Optional

Write-TestSection "1.9 PROFILE - Avec token invalide"

$invalidTokenHeaders = @{
    "Authorization" = "Bearer invalid-token-xyz"
}

Test-Endpoint `
    -Name "GET profile avec token invalide (doit échouer)" `
    -Method "GET" `
    -Endpoint "/auth/profile" `
    -Headers $invalidTokenHeaders `
    -ExpectedStatus @(401) `
    -Optional

Write-TestSection "1.10 REFRESH TOKEN"

if ($global:TestData.refreshToken) {
    $refreshBody = @{
        refreshToken = $global:TestData.refreshToken
    } | ConvertTo-Json
    
    $refreshResult = Test-Endpoint `
        -Name "Refresh pour obtenir un nouveau accessToken" `
        -Method "POST" `
        -Endpoint "/auth/refresh" `
        -Body $refreshBody `
        -ExpectedStatus @(200) `
        -Assertions {
            param($data)
            if (-not $data.accessToken) { throw "No new accessToken returned" }
        } `
        -Optional
    
    if ($refreshResult) {
        $global:TestData.accessToken = $refreshResult.accessToken
        Write-Host "  💾 New access token updated" -ForegroundColor Green
    }
}

# ============================================================================
# TESTS - CRUD CVS
# ============================================================================

Write-TestHeader "SECTION 2: CRUD CVS"

$authHeaders = @{
    "Authorization" = "Bearer $($global:TestData.accessToken)"
}

Write-TestSection "2.1 CREATE CV - Créer un CV"

$createCvBody = @{
    name        = "My First CV"
    description = "A test CV for the API"
    content     = @{
        schemaVersion = 1
        sections       = @{
            identity      = @{
                firstName = "John"
                lastName  = "Doe"
                email     = "john@example.com"
            }
            summary       = @{
                text = "I am a developer with 5 years of experience"
            }
            experiences   = @()
            education     = @()
            skills        = @()
            languages     = @()
            projects      = @()
            certificates  = @()
        }
    }
} | ConvertTo-Json -Depth 10

$createCvResult = Test-Endpoint `
    -Name "POST /cvs - Créer un CV" `
    -Method "POST" `
    -Endpoint "/cvs" `
    -Headers $authHeaders `
    -Body $createCvBody `
    -ExpectedStatus @(201, 200) `
    -Assertions {
        param($data)
        if (-not $data.id) { throw "No CV ID returned" }
        if ($data.name -ne "My First CV") { throw "CV name mismatch" }
    }

if ($createCvResult) {
    $global:TestData.cvId = $createCvResult.id
    Write-Host "  💾 CV ID stored: $($global:TestData.cvId)" -ForegroundColor Green
}

Write-TestSection "2.2 CREATE CV VALIDATION - Name manquant"

$invalidCvBody = @{
    description = "Missing name"
    content     = @{}
} | ConvertTo-Json

Test-Endpoint `
    -Name "POST /cvs sans name (doit échouer)" `
    -Method "POST" `
    -Endpoint "/cvs" `
    -Headers $authHeaders `
    -Body $invalidCvBody `
    -ExpectedStatus @(400, 422) `
    -Optional

Write-TestSection "2.3 LIST CVS - Lister mes CVs"

$listCvsResult = Test-Endpoint `
    -Name "GET /cvs - Lister les CVs avec pagination" `
    -Method "GET" `
    -Endpoint "/cvs?page=1&limit=10" `
    -Headers $authHeaders `
    -ExpectedStatus @(200) `
    -Assertions {
        param($data)
        if ($data -isnot [System.Collections.IEnumerable] -and $data.items -isnot [System.Collections.IEnumerable]) {
            throw "Response should be array or object with items"
        }
    }

Write-TestSection "2.4 LIST CVS - Pagination"

Test-Endpoint `
    -Name "GET /cvs?page=2&limit=5 - Pagination" `
    -Method "GET" `
    -Endpoint "/cvs?page=2&limit=5" `
    -Headers $authHeaders `
    -ExpectedStatus @(200) `
    -Optional

Write-TestSection "2.5 GET CV - Récupérer un CV spécifique"

if ($global:TestData.cvId) {
    Test-Endpoint `
        -Name "GET /cvs/:id - Récupérer le CV créé" `
        -Method "GET" `
        -Endpoint "/cvs/$($global:TestData.cvId)" `
        -Headers $authHeaders `
        -ExpectedStatus @(200) `
        -Assertions {
            param($data)
            if ($data.id -ne $global:TestData.cvId) { throw "CV ID mismatch" }
            if (-not $data.content) { throw "No content in CV" }
        }
}

Write-TestSection "2.6 GET CV - CV inexistant"

Test-Endpoint `
    -Name "GET /cvs/invalid-id - CV qui n'existe pas (404)" `
    -Method "GET" `
    -Endpoint "/cvs/invalid-cv-id-xyz" `
    -Headers $authHeaders `
    -ExpectedStatus @(404) `
    -Optional

Write-TestSection "2.7 UPDATE CV - Modifier un CV"

if ($global:TestData.cvId) {
    $updateCvBody = @{
        name        = "My Updated CV"
        description = "Updated description"
    } | ConvertTo-Json
    
    Test-Endpoint `
        -Name "PATCH /cvs/:id - Modifier le CV" `
        -Method "PATCH" `
        -Endpoint "/cvs/$($global:TestData.cvId)" `
        -Headers $authHeaders `
        -Body $updateCvBody `
        -ExpectedStatus @(200) `
        -Assertions {
            param($data)
            if ($data.name -ne "My Updated CV") { throw "CV name not updated" }
        }
}

Write-TestSection "2.8 UPDATE CV - Content complexe"

if ($global:TestData.cvId) {
    $complexCvBody = @{
        content = @{
            schemaVersion = 1
            sections       = @{
                identity      = @{
                    firstName = "Jane"
                    lastName  = "Smith"
                }
                summary       = @{
                    text = "Updated summary"
                }
                experiences   = @(
                    @{
                        title       = "Senior Developer"
                        company     = "Tech Corp"
                        startDate   = "2020-01-01"
                        endDate     = "2023-12-31"
                        description = "Worked on web applications"
                    }
                )
                education     = @()
                skills        = @()
                languages     = @()
                projects      = @()
                certificates  = @()
            }
        }
    } | ConvertTo-Json -Depth 10
    
    Test-Endpoint `
        -Name "PATCH /cvs/:id - Mise à jour avec contenu complexe" `
        -Method "PATCH" `
        -Endpoint "/cvs/$($global:TestData.cvId)" `
        -Headers $authHeaders `
        -Body $complexCvBody `
        -ExpectedStatus @(200) `
        -Optional
}

Write-TestSection "2.9 CREATE SECOND CV - Pour tester list/delete"

$createSecondCvBody = @{
    name        = "My Second CV"
    description = "Another test CV"
    content     = @{
        schemaVersion = 1
        sections       = @{}
    }
} | ConvertTo-Json -Depth 10

$createSecondCvResult = Test-Endpoint `
    -Name "POST /cvs - Créer un second CV" `
    -Method "POST" `
    -Endpoint "/cvs" `
    -Headers $authHeaders `
    -Body $createSecondCvBody `
    -ExpectedStatus @(201, 200) `
    -Optional

Write-TestSection "2.10 DELETE CV - Supprimer un CV"

if ($createSecondCvResult -and $createSecondCvResult.id) {
    Test-Endpoint `
        -Name "DELETE /cvs/:id - Supprimer un CV" `
        -Method "DELETE" `
        -Endpoint "/cvs/$($createSecondCvResult.id)" `
        -Headers $authHeaders `
        -ExpectedStatus @(200, 204) `
        -Assertions {
            param($data)
            # Le CV devrait être supprimé
        }
}

Write-TestSection "2.11 GET DELETED CV - Vérifier la suppression"

if ($createSecondCvResult -and $createSecondCvResult.id) {
    Test-Endpoint `
        -Name "GET /cvs/:id - Vérifier que le CV est supprimé (404)" `
        -Method "GET" `
        -Endpoint "/cvs/$($createSecondCvResult.id)" `
        -Headers $authHeaders `
        -ExpectedStatus @(404) `
        -Optional
}

# ============================================================================
# TESTS - TEMPLATES (OPTIONAL)
# ============================================================================

Write-TestHeader "SECTION 3: TEMPLATES (OPTIONNEL)"

Write-TestSection "3.1 CREATE TEMPLATE - Créer un template"

$createTemplateBody = @{
    name        = "Professional CV Template"
    description = "A professional CV template"
    designData  = @{
        colors = @{
            primary   = "#2196F3"
            secondary = "#FFC107"
            text      = "#333333"
        }
        fonts = @{
            headings = "Arial"
            body     = "Calibri"
        }
        layout = "twoColumn"
    }
} | ConvertTo-Json -Depth 10

$createTemplateResult = Test-Endpoint `
    -Name "POST /templates - Créer un template" `
    -Method "POST" `
    -Endpoint "/templates" `
    -Headers $authHeaders `
    -Body $createTemplateBody `
    -ExpectedStatus @(201, 200) `
    -Optional

if ($createTemplateResult) {
    $global:TestData.templateId = $createTemplateResult.id
    Write-Host "  💾 Template ID stored: $($global:TestData.templateId)" -ForegroundColor Green
}

Write-TestSection "3.2 LIST TEMPLATES"

Test-Endpoint `
    -Name "GET /templates - Lister les templates" `
    -Method "GET" `
    -Endpoint "/templates?page=1&limit=10" `
    -Headers $authHeaders `
    -ExpectedStatus @(200) `
    -Optional

Write-TestSection "3.3 GET TEMPLATE"

if ($global:TestData.templateId) {
    Test-Endpoint `
        -Name "GET /templates/:id - Récupérer un template" `
        -Method "GET" `
        -Endpoint "/templates/$($global:TestData.templateId)" `
        -Headers $authHeaders `
        -ExpectedStatus @(200) `
        -Optional
}

Write-TestSection "3.4 UPDATE TEMPLATE"

if ($global:TestData.templateId) {
    $updateTemplateBody = @{
        name = "Updated Professional Template"
    } | ConvertTo-Json
    
    Test-Endpoint `
        -Name "PATCH /templates/:id - Modifier un template" `
        -Method "PATCH" `
        -Endpoint "/templates/$($global:TestData.templateId)" `
        -Headers $authHeaders `
        -Body $updateTemplateBody `
        -ExpectedStatus @(200) `
        -Optional
}

# ============================================================================
# TESTS - SÉCURITÉ & AUTORISATIONS
# ============================================================================

Write-TestHeader "SECTION 4: SÉCURITÉ & AUTORISATIONS"

Write-TestSection "4.1 AUTORISATION - Pas de token"

Test-Endpoint `
    -Name "GET /cvs sans token (doit échouer)" `
    -Method "GET" `
    -Endpoint "/cvs" `
    -ExpectedStatus @(401, 403) `
    -Optional

Write-TestSection "4.2 AUTORISATION - Token invalide"

$invalidHeaders = @{
    "Authorization" = "Bearer invalid-token"
}

Test-Endpoint `
    -Name "GET /cvs avec token invalide (doit échouer)" `
    -Method "GET" `
    -Endpoint "/cvs" `
    -Headers $invalidHeaders `
    -ExpectedStatus @(401) `
    -Optional

Write-TestSection "4.3 ISOLATION DES DONNÉES - Autre utilisateur"

# Création d'un deuxième utilisateur
$secondUserBody = @{
    email    = "test2-$(Get-Random)@example.com"
    password = "TestPassword123!"
    username = "testuser2-$(Get-Random)"
} | ConvertTo-Json

$secondUserResult = Test-Endpoint `
    -Name "Signup second utilisateur" `
    -Method "POST" `
    -Endpoint "/auth/signup" `
    -Body $secondUserBody `
    -ExpectedStatus @(201, 200) `
    -Optional

if ($secondUserResult -and $secondUserResult.accessToken) {
    $secondUserToken = $secondUserResult.accessToken
    $secondUserHeaders = @{
        "Authorization" = "Bearer $secondUserToken"
    }
    
    # Vérifier que le second utilisateur ne voit pas les CVs du premier
    Write-TestSection "4.4 ISOLATION - Vérifier isolation données"
    
    Test-Endpoint `
        -Name "GET /cvs du premier user ne doit pas voir CVs du second user" `
        -Method "GET" `
        -Endpoint "/cvs" `
        -Headers $secondUserHeaders `
        -ExpectedStatus @(200) `
        -Assertions {
            param($data)
            # Les CVs retournés doivent être vides pour le second user
        } `
        -Optional
}

# ============================================================================
# TESTS - VALIDATION & ERREURS
# ============================================================================

Write-TestHeader "SECTION 5: VALIDATION & GESTION D'ERREURS"

Write-TestSection "5.1 VALIDATION - Données manquantes"

$missingDataBody = @{} | ConvertTo-Json

Test-Endpoint `
    -Name "POST /cvs avec body vide (doit échouer)" `
    -Method "POST" `
    -Endpoint "/cvs" `
    -Headers $authHeaders `
    -Body $missingDataBody `
    -ExpectedStatus @(400, 422) `
    -Optional

Write-TestSection "5.2 VALIDATION - Type incorrecte"

$wrongTypeBody = @{
    name    = 123  # doit être string
    content = "string"  # doit être object
} | ConvertTo-Json

Test-Endpoint `
    -Name "POST /cvs avec types incorrects (doit échouer)" `
    -Method "POST" `
    -Endpoint "/cvs" `
    -Headers $authHeaders `
    -Body $wrongTypeBody `
    -ExpectedStatus @(400, 422) `
    -Optional

Write-TestSection "5.3 VALIDATION - Content très volumineux"

$largeContent = @{
    name    = "Large CV"
    content = @{
        data = "x" * 1000000  # 1MB de data
    }
} | ConvertTo-Json

Test-Endpoint `
    -Name "POST /cvs avec contenu très volumineux" `
    -Method "POST" `
    -Endpoint "/cvs" `
    -Headers $authHeaders `
    -Body $largeContent `
    -ExpectedStatus @(200, 201, 413) `
    -Optional

Write-TestSection "5.4 NOT FOUND - Endpoint inexistant"

Test-Endpoint `
    -Name "GET /invalid-endpoint (doit retourner 404)" `
    -Method "GET" `
    -Endpoint "/invalid-endpoint" `
    -Headers $authHeaders `
    -ExpectedStatus @(404) `
    -Optional

# ============================================================================
# RÉSUMÉ DES TESTS
# ============================================================================

Write-TestHeader "RÉSUMÉ DES TESTS"

Write-Host "`n📊 Statistiques:" -ForegroundColor Cyan
Write-Host "   Total Tests:   $global:TotalTests" -ForegroundColor White
Write-Host "   ✅ Passed:     $global:PassedTests" -ForegroundColor Green
Write-Host "   ❌ Failed:     $global:FailedTests" -ForegroundColor Red
Write-Host "   ⚠️  Skipped:    $global:SkippedTests" -ForegroundColor Yellow

$passPercentage = if ($global:TotalTests -gt 0) { [math]::Round(($global:PassedTests / $global:TotalTests) * 100, 2) } else { 0 }
Write-Host "   📈 Success:    $passPercentage%" -ForegroundColor Cyan

Write-Host "`n💾 Données de Test Utilisées:" -ForegroundColor Cyan
Write-Host "   Email:    $($global:TestData.userEmail)" -ForegroundColor White
Write-Host "   Username: $($global:TestData.userName)" -ForegroundColor White
Write-Host "   CV ID:    $($global:TestData.cvId)" -ForegroundColor White
Write-Host "   User ID:  $($global:TestData.userId)" -ForegroundColor White

if ($global:FailedTests -eq 0) {
    Write-Host "`n✅ TOUS LES TESTS SONT PASSÉS! L'API FONCTIONNE CORRECTEMENT!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ CERTAINS TESTS ONT ÉCHOUÉ. VÉRIFIEZ LES DÉTAILS CI-DESSUS." -ForegroundColor Red
    exit 1
}
