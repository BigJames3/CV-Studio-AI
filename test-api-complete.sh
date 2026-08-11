#!/bin/bash

# ============================================================================
# 🧪 TEST COMPLET API - CV Studio AI (Bash/Curl Version)
# ============================================================================
# Script bash pour tester TOUS les endpoints de l'API
#
# Utilisation:
#   chmod +x test-api-complete.sh
#   ./test-api-complete.sh
#   ./test-api-complete.sh http://localhost:3001/api/v1
#   ./test-api-complete.sh http://localhost:3001/api/v1 true  # verbose
#
# ============================================================================

# Configuration
BASE_URL="${1:-http://localhost:3001/api/v1}"
VERBOSE="${2:-false}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Données de test
TEST_EMAIL="test-$RANDOM@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_USERNAME="testuser$RANDOM"
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
CV_ID=""
TEMPLATE_ID=""

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  $1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
}

print_section() {
    echo -e "\n${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📌 $1${NC}"
    echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local body="$4"
    local expected_status="${5:-200}"
    
    ((TOTAL_TESTS++))
    
    echo -e "\n  ${YELLOW}Test: $name${NC}"
    
    local uri="${BASE_URL}${endpoint}"
    
    if [ "$VERBOSE" = "true" ]; then
        echo -e "  ${GRAY}URI: $uri${NC}"
        echo -e "  ${GRAY}Method: $method${NC}"
        if [ -n "$body" ]; then
            echo -e "  ${GRAY}Body: $body${NC}"
        fi
    fi
    
    # Prépare les headers
    local headers="-H 'Content-Type: application/json'"
    if [ -n "$ACCESS_TOKEN" ]; then
        headers="$headers -H 'Authorization: Bearer $ACCESS_TOKEN'"
    fi
    
    # Effectue la requête
    local response
    if [ -n "$body" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$uri" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d "$body")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$uri" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN")
    fi
    
    # Extrait le status et le body
    local http_status=$(echo "$response" | tail -n1)
    local http_body=$(echo "$response" | sed '$d')
    
    # Affiche les résultats
    if [[ "$expected_status" == *"$http_status"* ]]; then
        echo -e "  ${GREEN}✅ Status: $http_status${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "  ${RED}❌ Status: $http_status (Expected: $expected_status)${NC}"
        ((FAILED_TESTS++))
        return 1
    fi
    
    # Parse et affiche le body
    if [ "$VERBOSE" = "true" ] && [ -n "$http_body" ]; then
        echo -e "  ${GRAY}Response: $http_body${NC}"
    fi
    
    echo "$http_body"
}

# ============================================================================
# TESTS - AUTHENTIFICATION
# ============================================================================

print_header "SECTION 1: AUTHENTIFICATION"

print_section "1.1 SIGNUP - Créer un compte utilisateur"

SIGNUP_BODY=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "username": "$TEST_USERNAME"
}
EOF
)

SIGNUP_RESPONSE=$(test_endpoint "Signup avec email/password/username" "POST" "/auth/signup" "$SIGNUP_BODY" "201 200")

if [ -n "$SIGNUP_RESPONSE" ]; then
    ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo -e "  ${GREEN}💾 Tokens stored for next tests${NC}"
    fi
fi

print_section "1.2 LOGIN - Se connecter"

LOGIN_BODY=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

test_endpoint "Login avec email/password" "POST" "/auth/login" "$LOGIN_BODY" "200"

print_section "1.3 PROFILE - Voir le profil authentifié"

test_endpoint "GET profile avec token valide" "GET" "/auth/profile" "" "200"

# ============================================================================
# TESTS - CRUD CVS
# ============================================================================

print_header "SECTION 2: CRUD CVS"

print_section "2.1 CREATE CV - Créer un CV"

CREATE_CV_BODY=$(cat <<EOF
{
  "name": "My First CV",
  "description": "A test CV for the API",
  "content": {
    "schemaVersion": 1,
    "sections": {
      "identity": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "summary": {
        "text": "I am a developer with 5 years of experience"
      },
      "experiences": [],
      "education": [],
      "skills": [],
      "languages": [],
      "projects": [],
      "certificates": []
    }
  }
}
EOF
)

CREATE_CV_RESPONSE=$(test_endpoint "POST /cvs - Créer un CV" "POST" "/cvs" "$CREATE_CV_BODY" "201 200")

if [ -n "$CREATE_CV_RESPONSE" ]; then
    CV_ID=$(echo "$CREATE_CV_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    if [ -n "$CV_ID" ]; then
        echo -e "  ${GREEN}💾 CV ID stored: $CV_ID${NC}"
    fi
fi

print_section "2.2 LIST CVS - Lister mes CVs"

test_endpoint "GET /cvs - Lister les CVs avec pagination" "GET" "/cvs?page=1&limit=10" "" "200"

print_section "2.3 GET CV - Récupérer un CV spécifique"

if [ -n "$CV_ID" ]; then
    test_endpoint "GET /cvs/:id - Récupérer le CV créé" "GET" "/cvs/$CV_ID" "" "200"
fi

print_section "2.4 UPDATE CV - Modifier un CV"

if [ -n "$CV_ID" ]; then
    UPDATE_CV_BODY=$(cat <<EOF
{
  "name": "My Updated CV",
  "description": "Updated description"
}
EOF
)
    
    test_endpoint "PATCH /cvs/:id - Modifier le CV" "PATCH" "/cvs/$CV_ID" "$UPDATE_CV_BODY" "200"
fi

print_section "2.5 CREATE SECOND CV - Pour tester delete"

CREATE_SECOND_CV_BODY=$(cat <<EOF
{
  "name": "My Second CV",
  "description": "Another test CV",
  "content": {
    "schemaVersion": 1,
    "sections": {}
  }
}
EOF
)

CREATE_SECOND_CV_RESPONSE=$(test_endpoint "POST /cvs - Créer un second CV" "POST" "/cvs" "$CREATE_SECOND_CV_BODY" "201 200")

SECOND_CV_ID=""
if [ -n "$CREATE_SECOND_CV_RESPONSE" ]; then
    SECOND_CV_ID=$(echo "$CREATE_SECOND_CV_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
fi

print_section "2.6 DELETE CV - Supprimer un CV"

if [ -n "$SECOND_CV_ID" ]; then
    test_endpoint "DELETE /cvs/:id - Supprimer un CV" "DELETE" "/cvs/$SECOND_CV_ID" "" "200 204"
fi

# ============================================================================
# TESTS - SÉCURITÉ & AUTORISATIONS
# ============================================================================

print_header "SECTION 3: SÉCURITÉ & AUTORISATIONS"

print_section "3.1 AUTORISATION - Pas de token"

# Sauvegrade le token actuel et le supprime temporairement
SAVED_TOKEN="$ACCESS_TOKEN"
ACCESS_TOKEN=""

test_endpoint "GET /cvs sans token (doit échouer)" "GET" "/cvs" "" "401 403"

# Restaure le token
ACCESS_TOKEN="$SAVED_TOKEN"

print_section "3.2 AUTORISATION - Token invalide"

SAVED_TOKEN="$ACCESS_TOKEN"
ACCESS_TOKEN="invalid-token-xyz"

test_endpoint "GET /cvs avec token invalide (doit échouer)" "GET" "/cvs" "" "401"

ACCESS_TOKEN="$SAVED_TOKEN"

# ============================================================================
# RÉSUMÉ DES TESTS
# ============================================================================

print_header "RÉSUMÉ DES TESTS"

echo -e "\n${CYAN}📊 Statistiques:${NC}"
echo -e "   Total Tests:   $TOTAL_TESTS"
echo -e "   ${GREEN}✅ Passed:     $PASSED_TESTS${NC}"
echo -e "   ${RED}❌ Failed:     $FAILED_TESTS${NC}"
echo -e "   ${YELLOW}⚠️  Skipped:    $SKIPPED_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
else
    PASS_PERCENTAGE=0
fi

echo -e "   ${CYAN}📈 Success:    $PASS_PERCENTAGE%${NC}"

echo -e "\n${CYAN}💾 Données de Test Utilisées:${NC}"
echo -e "   Email:    $TEST_EMAIL"
echo -e "   Username: $TEST_USERNAME"
echo -e "   CV ID:    $CV_ID"
echo -e "   User ID:  $USER_ID"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ TOUS LES TESTS SONT PASSÉS! L'API FONCTIONNE CORRECTEMENT!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ. VÉRIFIEZ LES DÉTAILS CI-DESSUS.${NC}"
    exit 1
fi
