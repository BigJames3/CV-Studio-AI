# Roadmap optimisée — CV Studio AI (post-audit)

| Champ          | Valeur                                                                                |
| -------------- | ------------------------------------------------------------------------------------- |
| Date           | 13 août 2026                                                                          |
| Base           | Code réel + `docs/ROADMAP-24M-CV-STUDIO-AI.md` + `docs/DELIVERY-STATUS-30-SPRINTS.md` |
| Brief d’entrée | Phases 4–9 (Perf → Security → QA → Features → Growth → Infra)                         |
| Décision       | **Réordonner**. Security + billing **avant** perf et features.                        |

Le brief suppose un MVP « semaines 1–3 » déjà en prod. **Faux.** La roadmap 24 mois du repo (Phase 1 MVP → Phase 6 scale) est plus proche de la réalité, mais **en avance sur le papier** (K8s, marketplace, mobile).

Cette version est calibrée **1–2 ingénieurs**, 6 mois, revenue d’abord.

---

## 1. Où on est vraiment

Le dépôt n’est pas « dashboard + Stripe + 4 emails + PostHog ». C’est un **MVP+** :

| Surface                                 | Statut réel         | À traiter comme                  |
| --------------------------------------- | ------------------- | -------------------------------- |
| Auth (JWT, 2FA, Google, LinkedIn)       | Fait                | GA                               |
| Éditeur dual-pane + 5 templates + PDF   | Fait                | GA                               |
| Dashboard + paywall 1 CV                | Fait                | GA                               |
| Stripe checkout + webhooks fail-closed  | Fait, UX incomplète | Beta payante                     |
| SMTP (3 mails)                          | Fait                | Beta                             |
| Analytics events table + stub Amplitude | Squelette           | Pas GA                           |
| AI optimize / cover letter / ATS        | Partiel             | Flag                             |
| Marketplace seller UI                   | Partiel             | Flag off                         |
| Mobile Expo                             | Scaffold            | Plus tard                        |
| Admin MRR / PostHog / Resend            | **Absents**         | Ne pas planifier comme « 6 min » |
| Collab / teams (schema Prisma)          | Schema > produit    | Plus tard                        |

**Conséquence :** les « phases 7 Advanced features » du brief **dupliquent** du travail déjà commencé. Priorité = **finir et durcir**, pas élargir.

---

## 2. Timeline réaliste (6 mois)

```
S0  (cette semaine)   P0 sécurité + money loop     ← chemin critique
S1  (semaine +1)      Closed beta interne
S2                    GDPR + RolesGuard + Sentry SDK
S3                    Observabilité events cœur
S4                    Perf baseline + invoices/portal polish
------ GO soft launch public (cible : fin S4 / S5) ------
S5–S6                 QA e2e + load léger          (ex-Phase 6, réduit)
S7–S8                 AI vertical slice solide     (ex-Phase 7, réduit)
S9–S10                Growth SEO + emails          (ex-Phase 8, réduit)
S11+                  Un pari : marketplace XOR mobile
Infra                 Continue (backups, staging CD) — pas un « phase 9 » séparée
```

Staffing indicatif : 1 fullstack + 0.2 design. Le tableau 8–33 FTE de la roadmap 24m **ne s’applique pas**.

---

## 3. Phase L0 — Launch hardening (remplace « Today 15 min » + Phase 5)

**Effort :** 1–2 semaines  
**Impact :** droit de lancer  
**Risque :** faible si on ne touche qu’à guards / billing

### Scope

- P0 : seed public, PDF public, JWT fail-fast, create-subscription bypass
- Billing : `cancel_at_period_end`, invoices UI, portal, delete+Stripe
- Legal : privacy, terms, export, delete UI
- Feature flags : marketplace / AI scaffolds off en prod

### Success metrics

- 0 endpoint mutatif public hors webhook + auth
- 1 parcours test card → Pro en DB
- Pages legal live
- Décision GO closed beta (voir `GO_NO_GO_DECISION.md`)

### Hors scope

PostHog account, admin dashboard, Lighthouse 90, referrals.

---

## 4. Phase L1 — Closed beta + observabilité (ex « Day 1 monitoring »)

**Effort :** 1 semaine  
**Impact :** on **voit** ce qui casse

### Scope

- Choisir **un** outil : Amplitude (ADR-018) **ou** PostHog — installer le SDK
- Consent + `enableAnalytics()`
- 8 events : signup, login, cv_created, paywall_viewed, checkout_started/succeeded/failed, cv_exported
- Dual-write serveur (TODO Amplitude dans `analytics.service.ts`)
- `@sentry/node` + `@sentry/nextjs` + 1 alerte
- Uptime sur `/health` et `/`

### Success metrics

- Event signup visible < 5 min après un compte test
- Exception volontaire visible dans Sentry
- 5–20 beta users, 0 P0 ouvert

---

## 5. Phase 4 revisée — Performance (après launch, pas avant)

**Effort :** 1 semaine  
**Impact :** conversion **si** du trafic existe. Avant trafic : ROI faible.

Le brief promettait « +20 % conversion ». Sans baseline ni trafic, c’est une invention. On **mesure** d’abord.

### Scope

| Couche   | Action                                                     | Notes code                       |
| -------- | ---------------------------------------------------------- | -------------------------------- |
| Frontend | `next/image` avatars/QR ; code-split éditeur               | 0 usage `next/image` aujourd’hui |
| Frontend | Timeout `apiClient` + retry mutations réseau               | Signal optionnel seulement       |
| CSS      | Dédupliquer `.cv-page-enter` (globals + tokens)            | Dette mineure                    |
| Backend  | EXPLAIN list CVs / invoices                                | Indexes Prisma déjà là           |
| DB       | Décider PgBouncer (pas dans Compose)                       | `directUrl` prévu                |
| Worker   | Ne pas faire du PDF sync 10 Mo en request path sous charge | Export public = risque           |

### Success metrics (à établir Semaine 4, pas à inventer)

| Métrique                     | Cible Phase 4 | Aujourd’hui |
| ---------------------------- | ------------- | ----------- |
| Lighthouse desktop marketing | ≥ 90          | Non mesuré  |
| Lighthouse mobile            | ≥ 80          | Non mesuré  |
| API p50 health               | < 50 ms       | Non mesuré  |
| API p95 list CVs             | < 200 ms      | Non mesuré  |
| FCP / LCP dashboard          | < 1.5s / 2.5s | Non mesuré  |
| Bundle JS First Load         | noter         | Non mesuré  |

Pas de « tests baseline established » tant que Lighthouse CI n’existe pas (`DELIVERY-STATUS` le liste déjà en remaining).

### Risques

- Micro-optims images pendant que le PDF public tourne encore → mauvais ordre.
- Connection pooling trop tôt (0 users) → over-engineering.

---

## 6. Phase 5 revisée — Security & GDPR (en grande partie **avant** Lighthouse)

**Effort :** 1 semaine restante après L0  
**Impact :** conformité, pas un nice-to-have

Le brief mettait GDPR « après lancement ». Pour un SaaS UE avec CVs (données perso), **c’est un prérequis public**.

### Scope restant après L0

- `RolesGuard` + allowlist admin (le brief citait `ADMIN_EMAILS` : **n’existe pas**)
- Rate limit : déjà global 120/min + Redis auth — étendre AI/export
- Password strength : partiel (auth DTO) — audit
- 2FA : **déjà là** (TOTP) — ne pas le replanifier comme « Phase 5 »
- CSP / Helmet : Helmet on ; audit headers Next
- Pen test externe : **plus tard** (budget), checklist interne `docs/security/PENTEST-CHECKLIST.md`

### Success metrics

- Privacy + export + delete + Stripe cancel
- 0 `@Public()` mutatif hors webhook/auth/health
- DPIA one-pager (`docs/security/GDPR-DPIA-OUTLINE.md` existe — le remplir)

---

## 7. Phase 6 revisée — QA (1.5 semaines → **réaliste 2 semaines, coverage 80 % abandonné**)

**Effort :** 2 semaines  
**Impact :** confiance scale — mais **1000 concurrent users** est hors sol à 0 MRR

### Scope

| Type | Faire                                                            | Ne pas faire                      |
| ---- | ---------------------------------------------------------------- | --------------------------------- |
| Unit | Auth cookies, entitlements, webhook cancel flag, deleteMe+Stripe | 90 % repo-wide                    |
| E2E  | signup → create CV → paywall → checkout mock/test                | Suite marketing entière           |
| Load | 50–100 VU API list + health                                      | 1000 VU, DB stress « enterprise » |
| CI   | Playwright **run** avec Postgres/Redis services                  | `--list` + `continue-on-error`    |

Couverture actuelle : ~14 fichiers de tests, gates **uniquement** AI + payments. Claim « Tests: all passing / 100 % » = documentation marketing, pas CI.

### Success metrics

- Payment-flow e2e vert en CI
- Coverage gates étendus à `subscriptions` + `auth` (modules, pas 80 % global)
- k6 ou artillery script 50 VU documenté

### Risques

- Écrire 200 tests sur marketplace pendant que checkout UI est cassé.

---

## 8. Phase 7 revisée — Advanced features (2 semaines → **slice, pas un second produit**)

**Effort :** 2 semaines  
**Impact :** différenciation **si** l’IA actuelle est fiable

Le brief listait collab + job matching + LinkedIn + GDrive. Le code a **déjà** : optimize-resume, cover-letter, ATS panel, OAuth LinkedIn, schema collab.

### Faire

1. Durcir `optimize-resume` + quotas + UX éditeur.
2. Cover letter : parcours utilisateur visible, pas seulement endpoint.
3. ATS : garder le panel ; améliorer le copy des recommandations.
4. Couper ou 501 les features AI scaffold (job match LLM, OCR, interview, …).

### Ne pas faire dans ces 2 semaines

- Collab realtime / comments / history (tables Prisma ≠ produit)
- Indeed / GDrive
- Mobile app
- « Preferences digest emails »

### Success metrics

- ≥ 40 % des beta Pro lancent 1 feature IA / semaine
- 0 endpoint AI qui renvoie un payload « queued/scaffold » en prod
- Coût LLM < X € / user Pro / mois (fixer X, ex. 1 €)

---

## 9. Phase 8 revisée — Growth (après events, pas avant)

**Effort :** 2–3 semaines  
**Impact :** +50–100 % growth **uniquement** s’il y a un numérateur

### Faire (ordre)

1. SEO : meta déjà partiel (`createPageMetadata`, sitemap, robots) — pages privacy/pricing/blog 3 articles ATS
2. Email : 4e template **payment succeeded / welcome** (manque vs claim)
3. Cron expiration / trial (claim du brief : **absent** — `@nestjs/schedule` pas dans l’API)
4. CTA paywall copy A/B **après** 100+ vues paywall

### Ne pas faire

- Referral / affiliate (events `referral_*` dans la taxonomie, **zéro** produit)
- Slack/SMS marketing
- CAC/LTV dashboard admin (formule sans `ANALYTICS_MARKETING_SPEND` ni tracking)

### Success metrics

- Activation : % signup → 1 CV exporté (cible beta : ≥ 40 %)
- Free→Pay : mesurer, cible 3.5 % **trop tôt** (PRD M12)

---

## 10. Phase 9 revisée — Infra (ongoing, pas un sprint « multi-région »)

**Effort :** continu, ~0.5 j / semaine  
**Impact :** uptime — 99.9 % n’est **pas** un objectif M1

### Déjà dans le repo (scaffold)

- Docker Compose (PG16, Redis, Mailpit)
- Dockerfiles api/web/worker
- GHA `cd-staging.yml` / `cd-prod.yml` (EKS blue-green)
- Terraform modules **incomplets** (RDS souvent variables only)
- Helm : README placeholder

### Faire maintenant

- Un vrai staging (Fly / Railway / un petit VPS / EKS si AWS déjà payé)
- Backups provider + 1 restore test
- Uptime + Sentry
- `prisma migrate deploy` dans CD

### Ne pas faire M1–M3

- Multi-région, read replicas, on-call rotation, « 99.9 % »
- Vercel **et** EKS en parallèle sans décision
- Terraform apply sur des modules vides

---

## 11. Mapping brief → réalité

| Brief                          | Verdict                            | Action                 |
| ------------------------------ | ---------------------------------- | ---------------------- |
| Phase 4 Perf week 4            | Trop tôt comme **prochaine** étape | Après L0–L1            |
| Phase 5 Security week 5        | Trop tard                          | **Semaine 0**          |
| Phase 6 QA 80 % + 1000 VU      | Irréaliste                         | E2E money + 50 VU      |
| Phase 7 AI/collab/intégrations | Collab trop tôt ; AI déjà partiel  | Slice AI only          |
| Phase 8 Growth +50–100 %       | Sans events = théâtre              | SEO + emails après SDK |
| Phase 9 Multi-region           | Overkill                           | Staging + backups      |

---

## 12. Allocation ressources (1 fullstack)

| Semaine | % temps                                    | Thème               |
| ------- | ------------------------------------------ | ------------------- |
| 0       | 100 %                                      | P0 + billing        |
| 1       | 70 % beta / 30 % legal+flags               | Closed beta         |
| 2       | 60 % GDPR/admin guard / 40 % Sentry        | L1                  |
| 3       | 50 % events / 50 % billing polish          | L1                  |
| 4       | 50 % perf measure / 50 % hotfix            | Lighthouse baseline |
| 5–6     | 70 % tests / 30 % produit                  | QA                  |
| 7–8     | 80 % AI slice / 20 % ops                   | Features            |
| 9–10    | 60 % SEO-email / 40 % conversion           | Growth              |
| 11+     | 100 % **un** pari (marketplace xor mobile) | —                   |

---

## 13. Risques roadmap

| Risque                             | Proba    | Mitigation                           |
| ---------------------------------- | -------- | ------------------------------------ |
| Reprendre le brief « 15 min prod » | Haute    | GO_NO_GO signé                       |
| Construire admin MRR sans events   | Haute    | Interdit tant que 8 events pas live  |
| Marketplace + mobile en parallèle  | Haute    | XOR                                  |
| Docs 100 fichiers vs code          | Certaine | Delivery-status > PRD pour le statut |
| Scope collab (schema déjà là)      | Moyenne  | Schema ≠ engagement de ship          |

---

## 14. Critères de succès globaux (6 mois)

| KPI                  | M0 (aujourd’hui) | M1 (soft launch) | M3      | M6     |
| -------------------- | ---------------- | ---------------- | ------- | ------ |
| Users inscrits       | ~0 prod          | 50–200           | 1k      | 5k     |
| MRR                  | 0                | > 0              | > 500 € | > 2k € |
| P0 sécu ouverts      | ≥ 3              | 0                | 0       | 0      |
| E2E payment CI       | non exécuté      | vert             | vert    | vert   |
| Lighthouse marketing | n/d              | mesuré           | ≥ 85    | ≥ 90   |
| Privacy/GDPR         | non              | min              | DPIA    | revu   |

Si M3 MRR = 0 : **ne pas** attaquer mobile/marketplace ; itérer activation et paywall.
