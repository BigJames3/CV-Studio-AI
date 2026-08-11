# 📋 Documentation Complète - Test API CV Studio AI

## 🎯 Vue d'Ensemble

Ce document décrit le test complet de l'API CV Studio AI, qui couvre:
- **5 sections de test**
- **30+ endpoints testés**
- **Authentification, CRUD, Sécurité, Validation**
- **~5-10 minutes d'exécution**

---

## 🧪 Qu'est-ce qui est Testé?

### Section 1: AUTHENTIFICATION (10 tests)
```
✅ 1.1  Signup - Créer un compte
✅ 1.2  Signup Validation - Email invalide (400)
✅ 1.3  Signup Validation - Mot de passe faible (400)
✅ 1.4  Signup Validation - Email déjà existant (400/409)
✅ 1.5  Login - Se connecter
✅ 1.6  Login Validation - Password incorrect (401)
✅ 1.7  Profile - Voir le profil (avec token)
✅ 1.8  Profile - Sans token (401)
✅ 1.9  Profile - Token invalide (401)
✅ 1.10 Refresh Token - Obtenir nouveau token
```

### Section 2: CRUD CVS (11 tests)
```
✅ 2.1  Create CV - Créer un CV
✅ 2.2  Create Validation - Données manquantes
✅ 2.3  List CVs - Lister avec pagination
✅ 2.4  List CVs - Pagination (page 2)
✅ 2.5  Get CV - Récupérer un CV spécifique
✅ 2.6  Get CV - CV inexistant (404)
✅ 2.7  Update CV - Modifier un CV
✅ 2.8  Update CV - Content complexe
✅ 2.9  Create Second CV
✅ 2.10 Delete CV - Supprimer un CV
✅ 2.11 Get Deleted CV - Vérifier suppression (404)
```

### Section 3: TEMPLATES (5 tests, optionnel)
```
✅ 3.1 Create Template
✅ 3.2 List Templates
✅ 3.3 Get Template
✅ 3.4 Update Template
✅ 3.5 Delete Template
```

### Section 4: SÉCURITÉ (4 tests)
```
✅ 4.1 Pas de token - GET /cvs (401)
✅ 4.2 Token invalide - GET /cvs (401)
✅ 4.3 Isolation données - Second user
✅ 4.4 Isolation - Vérifier données
```

### Section 5: VALIDATION & ERREURS (4 tests)
```
✅ 5.1 Données manquantes (400)
✅ 5.2 Types incorrects (400)
✅ 5.3 Content volumineux (413 ou 201)
✅ 5.4 Endpoint inexistant (404)
```

**Total: 34+ tests**

---

## 📊 Cas Testés

### Tests de Succès (Happy Path)
- ✅ Signup → accessToken
- ✅ Login → accessToken
- ✅ Créer CV → retourne ID
- ✅ Lister CVs → retourne array
- ✅ Modifier CV → updated
- ✅ Supprimer CV → 204/200
- ✅ Profil → retourne user

### Tests d'Erreur (Sad Path)
- ❌ Signup email invalide → 400
- ❌ Login password incorrect → 401
- ❌ GET sans token → 401
- ❌ CV inexistant → 404
- ❌ Token expiré → 401
- ❌ Données invalides → 400
- ❌ Content trop gros → 413

### Tests de Sécurité
- 🔒 Isolation données (user voit que SES données)
- 🔒 Authorization (token requis)
- 🔒 Validation des inputs
- 🔒 Erreur messages génériques (pas de leak)

---

## 🚀 Comment Exécuter le Test

### Option 1: PowerShell (Windows)

```powershell
# 1. Va dans le dossier du projet
cd "D:\Projets\CV Studio AI"

# 2. Lance le script
.\test-api-complete.ps1

# 3. Attends ~5-10 minutes
# 4. Regarde le résumé
```

**Avec options:**
```powershell
# Test verbose
.\test-api-complete.ps1 -Verbose

# Test sur une URL personnalisée
.\test-api-complete.ps1 -BaseUrl "http://api.example.com/api/v1"

# Sans cleanup final
.\test-api-complete.ps1 -SkipCleanup
```

### Option 2: Bash/Curl (Linux/Mac)

```bash
# 1. Rend le script exécutable
chmod +x test-api-complete.sh

# 2. Lance le script
./test-api-complete.sh

# 3. Attends ~5-10 minutes
# 4. Regarde le résumé
```

**Avec options:**
```bash
# Test verbose
./test-api-complete.sh http://localhost:3001/api/v1 true

# Test sur une URL personnalisée
./test-api-complete.sh http://api.example.com/api/v1 false
```

### Option 3: Postman (GUI)

1. Importe la collection (voir: test-api-postman-collection.json)
2. Configure l'environnement (BASE_URL, token, etc.)
3. Exécute la collection entière
4. Vois les résultats visuellement

---

## ✅ Résultat Attendu

### Output Réussi

```
╔════════════════════════════════════════════════════════════╗
║  SECTION 1: AUTHENTIFICATION                             ║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 1.1 SIGNUP - Créer un compte utilisateur
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Test: Signup avec email/password/username
  ✅ Status: 201
  ✅ Assertions passed
  ✅ Test passed
  💾 Tokens stored for next tests

... (autres tests) ...

╔════════════════════════════════════════════════════════════╗
║  RÉSUMÉ DES TESTS                                         ║
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

### Output avec Erreurs

```
Test: Signup avec email/password/username
  ❌ Status: 500 (Expected: 201)
  ❌ Test failed: Connection refused

... (autres tests) ...

❌ CERTAINS TESTS ONT ÉCHOUÉ. VÉRIFIEZ LES DÉTAILS CI-DESSUS.

Exit code: 1
```

---

## 🔍 Interprétation des Résultats

### Tous les tests passent (100%)
```
✅ L'API fonctionne parfaitement
✅ Prêt pour développement/production
✅ Aucune action requise
```

### 95-99% des tests passent
```
⚠️ Quelques tests échouent (probablement optionnels)
⚠️ Vérifiez les erreurs listées
⚠️ Peut être dû à:
   - Tests flaky (timing)
   - Endpoints optionnels
   - Configuration incomplète
```

### 80-94% des tests passent
```
❌ Plusieurs tests échouent
❌ L'API a des problèmes
❌ Vérifiez:
   - Les logs du backend
   - La connexion à la DB
   - Les variables d'environnement
```

### < 80% des tests passent
```
🔴 Majorité des tests échouent
🔴 L'API ne fonctionne pas
🔴 Diagnostiquez d'urgence:
   1. Backend démarre-t-il?
   2. PostgreSQL/Redis en cours?
   3. Variables d'environnement?
   4. Migrations appliquées?
```

---

## 🛠️ Troubleshooting

### Erreur: "Connection refused"
```
❌ Le backend n'est pas lancé
✅ Solution:
   pnpm dev --filter=@cvstudio/api
```

### Erreur: "Database connection failed"
```
❌ PostgreSQL n'est pas accessible
✅ Solution:
   docker compose up -d postgres
   docker compose ps  # Vérifier que c'est Up
```

### Erreur: "Cannot find module"
```
❌ Les dépendances ne sont pas installées
✅ Solution:
   pnpm install
   pnpm typecheck  # Vérifier la compilation
```

### Erreur: "401 Unauthorized"
```
❌ Token JWT invalide ou expiré
✅ Solution:
   Vérifier que JWT_SECRET est correct
   Vérifier que les tokens ont le bon format
```

### Erreur: "400 Bad Request"
```
❌ Les données envoyées sont invalides
✅ Solution:
   Vérifier le JSON envoyé
   Vérifier les types de données
   Vérifier la validation des DTOs
```

### Erreur: "404 Not Found"
```
❌ L'endpoint n'existe pas
✅ Solution:
   Vérifier le path exact
   Vérifier que le endpoint est implémenté
   Vérifier la version de l'API
```

### Erreur: "Timeout"
```
❌ Le backend répond trop lentement
✅ Solution:
   Vérifier la performance de la DB
   Checker les queries lentes
   Ajouter des indexes
```

---

## 📈 Métriques de Performance

Le script mesure aussi les performances:

```
Performance Metrics:
   Signup:        125ms   (< 500ms ✅)
   Login:         98ms    (< 500ms ✅)
   Create CV:     245ms   (< 1000ms ✅)
   List CVs:      167ms   (< 1000ms ✅)
   Update CV:     189ms   (< 1000ms ✅)
   Delete CV:     112ms   (< 1000ms ✅)

Average:         155ms   (< 500ms ✅)
```

### Seuils Acceptables
- Signup/Login: < 500ms
- CRUD: < 1000ms
- List: < 1000ms
- Moyenne: < 500ms

---

## 🔐 Sécurité Vérifiée

Le test vérifie:

```
✅ Authentification requise
   - Les endpoints protégés demandent un token
   - Les tokens invalides sont rejetés

✅ Isolation des données
   - Chaque user voit que SES données
   - Pas d'accès cross-user

✅ Validation des inputs
   - Les données invalides sont rejetées
   - Les messages d'erreur sont génériques (pas de leak)

✅ Gestion des erreurs
   - Pas d'exception brutes
   - Codes d'erreur appropriés (400, 401, 404, 500)
```

---

## 📋 Checklist d'Avant-Production

Avant de mettre en production, assure-toi:

- [ ] Tous les tests passent (100%)
- [ ] Performance acceptable (< 500ms moyenne)
- [ ] Sécurité validée
- [ ] Données isolées par user
- [ ] Logs du backend clairs
- [ ] Variables d'environnement sécurisées
- [ ] Database backupée
- [ ] Redis configuré
- [ ] HTTPS activé
- [ ] Rate limiting en place
- [ ] Monitoring en place
- [ ] Alertes en place

---

## 🚀 Prochaines Étapes Après les Tests

### Si Tous les Tests Passent ✅
1. Déployer en staging
2. Tester en conditions réelles
3. Tester avec plusieurs utilisateurs
4. Tester les cas limites
5. Déployer en production

### Si Certains Tests Échouent ❌
1. Identifier les endpoints en erreur
2. Vérifier les logs du backend
3. Déboguer avec des requêtes manuelles
4. Corriger le code
5. Relancer les tests

### Si les Tests Timeout ⏱️
1. Vérifier la performance de la DB
2. Ajouter des indexes
3. Optimiser les queries
4. Vérifier l'espace disque
5. Vérifier la RAM disponible

---

## 💡 Tips & Tricks

### Exécuter un Test Spécifique
```powershell
# Modifier le script pour commenter les autres tests
# Ou adapter le script pour prendre un paramètre --test="1.1"
```

### Exécuter les Tests en Boucle
```powershell
# Pour vérifier la stabilité
for ($i = 1; $i -le 10; $i++) {
    Write-Host "`nItération $i"
    .\test-api-complete.ps1
}
```

### Envoyer les Résultats par Email
```powershell
# Capturer les résultats dans un fichier
.\test-api-complete.ps1 | Tee-Object -FilePath "test-results.txt"

# Envoyer par email
Send-MailMessage -To "team@example.com" -Attachment "test-results.txt"
```

### Intégrer dans CI/CD
```yaml
# .github/workflows/test.yml
- name: Run API Tests
  run: .\test-api-complete.ps1
  
- name: Check Results
  if: failure()
  run: exit 1
```

---

## 📞 Support & Questions

**Le test montre une erreur?**
→ Vérifiez la section "Troubleshooting" ci-dessus

**Vous avez une question?**
→ Consultez les prompts dans `PROMPTS_VERIFICATION_BACKEND_API.md`

**Vous voulez ajouter des tests?**
→ Modifiez le script et ajoutez des `Test-Endpoint` calls

---

## 📝 Résumé

Ce test complet:
- ✅ Teste 30+ endpoints
- ✅ Vérifie l'authentification
- ✅ Valide le CRUD
- ✅ Teste la sécurité
- ✅ Mesure la performance
- ✅ Prend 5-10 minutes
- ✅ Fournit un rapport détaillé

**Résultat:**
- 100% de tests passent = API prête pour production 🚀

