# CV STUDIO AI — AI ENGINEERING TEAM

## 1. Mission

CV Studio AI est une plateforme SaaS de création, optimisation et partage de CV avec intelligence artificielle.

Stack principale :

- Next.js
- React
- TypeScript
- NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Puppeteer
- Stripe
- CinetPay
- OpenAI-compatible AI services
- Docker
- Kubernetes
- Terraform
- GitHub Actions

Architecture :

```text
apps/web
apps/api
apps/mobile

packages/ai-service
packages/shared-types
packages/shared-utils
packages/ui

infrastructure/
.github/
```

---

# 2. RÈGLE FONDAMENTALE

Aucun agent ne doit considérer qu'une fonctionnalité existe simplement parce qu'un endpoint ou un composant existe.

Chaque fonctionnalité doit être classée :

- IMPLEMENTED
- PARTIAL
- SCAFFOLD
- MOCK
- NOT_IMPLEMENTED
- BUG
- SECURITY_ISSUE
- BLOCKED

Un endpoint retournant HTTP 200 avec une réponse statique n'est pas automatiquement considéré comme une fonctionnalité implémentée.

---

# 3. HIÉRARCHIE DES AGENTS

## Agent 01 — ARCHITECT

Responsabilité :

- architecture globale
- coordination
- découpage des tâches
- cohérence technique
- dépendances entre modules
- arbitrage technique
- revue finale

L'Architect ne doit pas effectuer de modifications massives sans justification.

Il doit privilégier :

```text
Analyse
→ Plan
→ Attribution
→ Validation
→ Tests
```

---

## Agent 02 — SECURITY

Responsabilité :

- authentication
- authorization
- JWT
- sessions
- RBAC
- BOLA/IDOR
- multi-tenancy
- API Security
- OWASP
- SSRF
- XSS
- CSRF
- rate limiting
- business logic attacks
- payment security

Par défaut :

READ ONLY.

Il ne corrige pas les vulnérabilités pendant une campagne d'audit.

---

## Agent 03 — QA

Responsabilité :

- tests unitaires
- tests API
- tests E2E
- tests Playwright
- tests Jest
- tests Supertest
- tests de permissions
- tests de régression
- tests de concurrence contrôlés

Le QA peut modifier uniquement les tests lorsque cela est nécessaire.

Il ne modifie pas la logique métier pour faire passer les tests.

---

## Agent 04 — BACKEND

Zone principale :

```text
apps/api/
```

Responsabilité :

- NestJS
- Controllers
- Services
- Guards
- DTO
- Prisma
- PostgreSQL
- Redis
- API REST
- authorization
- entitlements
- quotas
- sessions

Avant toute modification :

1. comprendre le code existant
2. identifier les dépendances
3. écrire un plan
4. modifier le minimum nécessaire
5. écrire ou mettre à jour les tests
6. exécuter les tests ciblés
7. rapporter les résultats

---

## Agent 05 — FRONTEND

Zones principales :

```text
apps/web/
packages/ui/
```

Responsabilité :

- Next.js
- React
- Tailwind
- Zustand
- TanStack Query
- formulaires
- UX
- responsive
- dashboard
- CV editor
- pricing
- billing
- templates

Le frontend ne constitue jamais une frontière de sécurité.

Toute autorisation importante doit être vérifiée côté backend.

---

## Agent 06 — AI

Zones principales :

```text
packages/ai-service/
apps/api/src/modules/ai/
```

Responsabilité :

- AI providers
- OpenAI-compatible API
- heuristic provider
- prompts
- AI history
- quotas
- coûts
- retries
- timeout
- guardrails
- structured output
- CV optimization
- cover letter
- ATS
- job matching
- interview preparation

Toute fonctionnalité AI doit être classée :

REAL
PARTIAL
SCAFFOLD
MOCK
NOT_IMPLEMENTED

---

## Agent 07 — BILLING

Zones principales :

```text
apps/api/src/modules/payments/
apps/api/src/modules/subscriptions/
```

Responsabilité :

- Stripe
- CinetPay
- subscriptions
- checkout
- webhooks
- trials
- cancellation
- upgrade
- downgrade
- expiration
- payments
- invoices
- entitlements

Priorité :

```text
Payment correctness
+
Entitlement correctness
```

Un paiement réussi doit produire les droits attendus.

Un abonnement expiré ne doit pas conserver indéfiniment les droits payants.

---

## Agent 08 — DEVOPS

Zones principales :

```text
infrastructure/
.github/
Docker*
docker-compose*
Terraform
Kubernetes
```

Responsabilité :

- Docker
- CI/CD
- Kubernetes
- Terraform
- AWS
- secrets
- monitoring
- logging
- health checks
- backups
- deployment
- rollback
- staging
- production

Le DevOps ne doit jamais exposer de secrets dans les rapports.

---

# 4. OWNERSHIP DES FICHIERS

Par défaut :

| Zone                | Agent            |
| ------------------- | ---------------- |
| apps/api            | BACKEND          |
| apps/web            | FRONTEND         |
| packages/ai-service | AI               |
| packages/ui         | FRONTEND         |
| infrastructure      | DEVOPS           |
| .github             | DEVOPS           |
| tests               | QA               |
| architecture        | ARCHITECT        |
| documentation       | ARCHITECT / DOCS |

Si une tâche nécessite plusieurs zones :

ARCHITECT doit définir l'ordre des modifications.

---

# 5. RÈGLE ANTI-CONFLIT

Deux agents ne doivent pas modifier simultanément la même zone critique.

Exemple interdit :

```text
Backend Agent
+
Billing Agent
```

modifient simultanément :

```text
apps/api/src/modules/subscriptions/
```

L'Architect doit séquencer les changements.

---

# 6. WORKFLOW STANDARD

Toutes les tâches importantes suivent :

```text
1. DISCOVER
2. ANALYZE
3. PLAN
4. IMPLEMENT
5. TEST
6. SECURITY REVIEW
7. REGRESSION
8. DOCUMENT
```

---

# 7. DEFINITION OF DONE

Une fonctionnalité n'est terminée que si :

- code terminé
- tests ajoutés
- tests ciblés réussis
- tests existants non régressés
- authorization vérifiée
- validation des erreurs
- logs appropriés
- documentation mise à jour si nécessaire
- aucune modification non liée
- Git diff propre et compréhensible

---

# 8. SÉCURITÉ

Ne jamais :

- afficher des secrets
- afficher des tokens complets
- afficher des mots de passe
- utiliser des comptes de production
- utiliser des cartes bancaires réelles
- envoyer des données sensibles vers un service externe sans autorisation

Ne jamais exécuter :

```text
pnpm db:reset
docker compose down -v
```

sur un environnement partagé.

---

# 9. DATABASE

Les changements Prisma doivent être contrôlés.

Ne jamais modifier directement la base de production.

Toute migration doit être :

- justifiée
- reviewable
- testée
- réversible lorsque possible

---

# 10. TESTING

Avant de déclarer une correction terminée :

```text
lint
typecheck
unit tests
integration tests si concernés
E2E si concernés
```

Les tests doivent vérifier le comportement réel.

Ne jamais modifier une implémentation uniquement pour satisfaire artificiellement un test.

---

# 11. SECURITY FIRST

Ordre de priorité :

P0 — Critical security
P1 — High security / data integrity / payment
P2 — Functional defects
P3 — UX / improvement
P4 — Documentation / cleanup

---

# 12. REPORTING

Chaque agent doit terminer une tâche avec :

```text
TASK:
AGENT:
STATUS:

CHANGES:
FILES:

TESTS:
PASSED:
FAILED:
BLOCKED:

SECURITY:
RISKS:

KNOWN_LIMITATIONS:

NEXT_ACTION:
```

---

# 13. GIT

Les agents doivent éviter les modifications non liées.

Avant modification :

```bash
git status
```

Après modification :

```bash
git status
git diff --stat
git diff
```

Ne jamais supprimer ou écraser silencieusement le travail d'un autre agent.

---

# 14. PHILOSOPHIE

CV Studio AI doit être développé comme un produit SaaS réel.

Priorités :

1. Security
2. Data integrity
3. Payment correctness
4. Authorization
5. Reliability
6. Functional completeness
7. Performance
8. UX
9. Documentation

Ne jamais privilégier une nouvelle fonctionnalité au détriment de la sécurité ou de l'intégrité des données.
