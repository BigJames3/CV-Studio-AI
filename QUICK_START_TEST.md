# ⚡ Guide Rapide - Exécuter le Test Complet en 5 Minutes

## 🎯 Résumé Ultra-Rapide

```
1. Lance le backend
2. Lance le script de test
3. Attends 5-10 minutes
4. Lis le résumé
5. ✅ Done!
```

---

## 📋 Prérequis (2 minutes)

### Vérifier que tout est Prêt

```powershell
# Terminal 1: Vérifie les services
docker compose ps
# ✅ postgres doit être Up
# ✅ redis doit être Up

# Terminal 2: Lance le backend
pnpm dev --filter=@cvstudio/api
# ✅ Doit afficher "Server running on port 3001"

# Attends que le backend soit prêt (~30 secondes)
```

### Résultat Attendu
```
NAME      IMAGE                COMMAND                STATUS
postgres  postgres:16-alpine   "docker-entrypoint.s…" Up 5 minutes
redis     redis:7-alpine       "docker-entrypoint.s…" Up 5 minutes

[Nest] 12345  - 01/01/2024, 10:00:00 AM     LOG [NestFactory] Application initialized
[Nest] 12345  - 01/01/2024, 10:00:00 AM     LOG [RoutesResolver] AppController {/api/v1/}: 
✅ Server running on http://localhost:3001
```

---

## 🚀 Lancer le Test (1 minute)

### Windows PowerShell

```powershell
cd "D:\Projets\CV Studio AI"

# Copie-colle le fichier test-api-complete.ps1 dans le dossier

# Lance le test
.\test-api-complete.ps1

# Attends ~5-10 minutes...
```

### Linux/Mac Bash

```bash
cd ~/Projets/CV\ Studio\ AI

# Rend le script exécutable
chmod +x test-api-complete.sh

# Lance le test
./test-api-complete.sh

# Attends ~5-10 minutes...
```

### Veux tu voir les Détails?

```powershell
# Mode verbose (affiche chaque requête)
.\test-api-complete.ps1 -Verbose

# Test sur une URL personnalisée
.\test-api-complete.ps1 -BaseUrl "http://api.example.com/api/v1"
```

---

## 📊 Pendant le Test

Le script affiche en temps réel:

```
╔════════════════════════════════════════════════════════════╗
║       CV Studio AI - API Test Suite                       ║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 SECTION 1: AUTHENTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Test: Signup avec email/password/username
  ✅ Status: 201
  ✅ Assertions passed
  ✅ Test passed
  💾 Tokens stored for next tests

  Test: Signup avec email invalide (doit échouer)
  ✅ Status: 400
  ✅ Test passed

  ... (etc) ...

⏳ (En cours... ~30 secondes par section)
```

### Ce que le test fait

```
Section 1: Authentification     (2-3 min)
  ├─ Signup
  ├─ Login
  ├─ Profile
  ├─ Refresh Token
  └─ Validations

Section 2: CRUD CVs            (2-3 min)
  ├─ Create CV
  ├─ List CVs
  ├─ Get CV
  ├─ Update CV
  └─ Delete CV

Section 3: Templates            (1 min, optionnel)
  ├─ Create Template
  ├─ List Templates
  └─ Update/Delete

Section 4: Sécurité             (1 min)
  ├─ Auth required
  ├─ Token validation
  └─ Data isolation

Section 5: Validation           (1 min)
  ├─ Invalid data
  ├─ Type errors
  └─ Edge cases

Total: 5-10 minutes
```

---

## ✅ Après le Test

### Résumé Final

```
╔════════════════════════════════════════════════════════════╗
║                    RÉSUMÉ DES TESTS                       ║
╚════════════════════════════════════════════════════════════╝

📊 Statistiques:
   Total Tests:   34
   ✅ Passed:     34
   ❌ Failed:     0
   ⚠️  Skipped:    0
   📈 Success:    100%

💾 Données de Test Utilisées:
   Email:    test-12345@example.com
   Username: testuser67890
   CV ID:    clh7z...
   User ID:  clh7z...

✅ TOUS LES TESTS SONT PASSÉS! L'API FONCTIONNE CORRECTEMENT!
```

### Interprétation

```
✅ Success: 100%
   → API PRÊTE POUR PRODUCTION 🚀

⚠️ Success: 95-99%
   → Quelques tests échouent (probablement optionnels)
   → Vérifiez les erreurs spécifiques

❌ Success: < 95%
   → L'API a des problèmes
   → Vérifiez les logs du backend
   → Lancez le diagnostic
```

---

## 🔴 Si des Tests Échouent

### Step 1: Lire l'Erreur

```
❌ Test failed: Connection refused
   ← Le backend n'est pas lancé

❌ Test failed: Cannot find module 'decorators'
   ← Les fichiers manquent (vérifiez les corrections antérieures)

❌ Test failed: 500 Internal Server Error
   ← Bug dans l'API (vérifiez les logs)

❌ Test failed: 401 Unauthorized
   ← Problème de token JWT (vérifiez les variables d'environnement)
```

### Step 2: Vérifier les Prérequis

```powershell
# 1. Backend lancé?
curl http://localhost:3001/api/v1/health

# 2. PostgreSQL UP?
docker compose ps | grep postgres

# 3. Redis UP?
docker compose ps | grep redis

# 4. Variables d'environnement?
Get-Content apps/api/.env | Select-String "DATABASE_URL|JWT"
```

### Step 3: Vérifier les Logs

```powershell
# Logs du backend
# (Regarde le terminal où le backend s'exécute)

# Logs PostgreSQL
docker compose logs postgres --tail 50

# Logs Redis
docker compose logs redis --tail 50
```

### Step 4: Déboguer

```powershell
# Lancer le test en mode verbose
.\test-api-complete.ps1 -Verbose

# Cela affichera plus de détails sur ce qui échoue
```

### Step 5: Suivre le Prompt de Diagnostic

```
Consulte: PROMPTS_VERIFICATION_BACKEND_API.md
Prompt #1: Diagnostic d'Urgence Backend
```

---

## 📋 Checklist de Succès

Vérifie que tous les points sont ✅:

```
Avant le test:
  ✅ Docker (PostgreSQL + Redis) en cours
  ✅ Backend lancé sur port 3001
  ✅ Pas d'erreur au démarrage du backend
  ✅ Script test-api-complete.ps1 téléchargé

Pendant le test:
  ✅ Les tests s'exécutent sans freeze
  ✅ Les messages s'affichent en temps réel
  ✅ Pas de timeout (> 30 secondes par test)

Après le test:
  ✅ 100% de tests passent
  ✅ Pas de ❌ en rouge
  ✅ Pas de ⚠️ erreurs
  ✅ Message "TOUS LES TESTS SONT PASSÉS"

Résumé final:
  ✅ Total Tests > 30
  ✅ Failed = 0
  ✅ Success = 100%
```

---

## 🎯 Résultat = Succès ✅

Si le test passe à 100%:

```
✅ L'API est prête!
✅ Backend fonctionne parfaitement
✅ Database connectée
✅ Authentification fonctionne
✅ CRUD fonctionne
✅ Sécurité validée
✅ Performance acceptable

Prochaines étapes:
1. Lancer le frontend (pnpm dev --filter=@cvstudio/web)
2. Tester l'intégration frontend-backend
3. Déployer en staging
4. Déployer en production
```

---

## ❌ Résultat = Erreurs ❌

Si certains tests échouent:

```
❌ L'API a des problèmes
❌ À corriger avant de continuer

Actions:
1. Lire l'erreur exacte
2. Vérifier les prérequis (Docker, ports)
3. Consulter le Troubleshooting ci-dessus
4. Utiliser le Prompt #1 de diagnostic
5. Corriger le backend
6. Relancer le test
```

---

## 📊 Tableau de Synthèse

| Étape | Action | Durée | Prérequis |
|-------|--------|-------|-----------|
| 1 | Vérifier Docker | 1 min | Docker Desktop |
| 2 | Lancer backend | 1 min | pnpm, Node |
| 3 | Télécharger script | 1 min | Navigateur |
| 4 | Exécuter test | 5-10 min | Backend running |
| 5 | Lire résumé | 2 min | Eyes 👀 |
| **Total** | | **10-15 min** | |

---

## 🚀 Commandes Rapides à Copier-Coller

### Windows PowerShell (Copy-Paste)

```powershell
# Tout en un (d'un terminal):
cd "D:\Projets\CV Studio AI"; `
Write-Host "1. Backend..." -ForegroundColor Cyan; `
pnpm dev --filter=@cvstudio/api &
Write-Host "2. En attente que le backend démarre (30 sec)..." -ForegroundColor Yellow; `
Start-Sleep -Seconds 30; `
Write-Host "3. Exécution des tests..." -ForegroundColor Cyan; `
.\test-api-complete.ps1
```

### Linux/Mac Bash (Copy-Paste)

```bash
#!/bin/bash
cd ~/Projets/CV\ Studio\ AI
echo "1. Backend..."
pnpm dev --filter=@cvstudio/api &
echo "2. En attente que le backend démarre (30 sec)..."
sleep 30
echo "3. Exécution des tests..."
chmod +x test-api-complete.sh
./test-api-complete.sh
```

---

## 💡 Tips Finale

```
💡 Le test crée un utilisateur aléatoire
  → Pas de conflit si tu le relances plusieurs fois
  
💡 Le test ne supprime rien en prod
  → Les données sont isolées dans la DB
  
💡 Les tokens JWT sont temporaires
  → Pas de problème après le test
  
💡 Tu peux relancer plusieurs fois
  → Chaque run est indépendant
  
💡 Ajoute des tests personnalisés
  → Modifie le script PowerShell
  → Ajoute des Test-Endpoint calls
```

---

## 📞 Si Tu as une Question

**Le test échoue?**
→ Vérifiez: Prérequis → Logs → Troubleshooting → Prompt #1

**Comment ajouter un test?**
→ Modifiez le script PowerShell
→ Ajoutez une ligne: `Test-Endpoint -Name "Mon Test"...`

**Comment exécuter UN test seul?**
→ Commentez les autres dans le script
→ Ou modifiez pour accepter `--test="1.1"`

---

**Prêt à tester? 🚀**

```powershell
cd "D:\Projets\CV Studio AI"
.\test-api-complete.ps1
```

**Patience... ⏳ (5-10 minutes)**

**Succès! ✅**

