# GO / NO-GO — CV Studio AI

| Champ               | Valeur                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| Date d’audit        | 13 août 2026                                                                    |
| Périmètre           | Code réel (`apps/web`, `apps/api`, Prisma, CI, infra) — pas les claims du brief |
| Décision            | **NO-GO production publique**                                                   |
| Décision secondaire | **GO dogfood / closed beta** après correction des P0 (estimé 2–4 jours)         |
| Sign-off            | Voir §5                                                                         |

---

## 1. Réponse directe

**Ne pas lancer en production publique aujourd’hui.**

Le brief d’entrée (« Semaines 1–3 100 % complètes, 0 dette, 6 minutes de config PostHog/Sentry, GO ») **ne correspond pas au dépôt**. Le produit cœur (auth, éditeur, dashboard, paywall, checkout Stripe) est **réel et avancé**. L’observabilité, l’admin analytics, le legal GDPR, et plusieurs contrôles de sécurité **ne sont pas prêts**.

Lancer maintenant, c’est exposer :

1. un endpoint public qui mute le catalogue templates ;
2. un render PDF Chromium **non authentifié** (HTML jusqu’à 10 Mo) ;
3. des secrets JWT de fallback si les env prod sont oubliés ;
4. des utilisateurs « supprimés » encore facturés par Stripe ;
5. zéro politique de confidentialité / consentement cookies ;
6. zéro visibilité produit (PostHog/Amplitude non branchés, Sentry SDK absent).

---

## 2. Critères vérifiés

| Critère                                | Seuil GO                    | Constat                                                                            | Verdict          |
| -------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| Auth signup / login / refresh / logout | Fonctionnel                 | Implémenté (JWT rotation, 2FA, OAuth Google/LinkedIn)                              | **Pass**         |
| Dashboard CV + paywall Free (1 CV)     | Fonctionnel                 | `PaywallModal` + `ENTITLEMENT_REQUIRED`                                            | **Pass**         |
| Checkout Stripe + webhooks signés      | Fonctionnel                 | Checkout + `constructEvent` + DLQ                                                  | **Pass partiel** |
| Factures + Customer Portal + cancel UI | Complet                     | API invoices OK ; UI = placeholder ; pas de portal                                 | **Fail**         |
| Emails transactionnels fiables         | 4 templates + provider prod | 3 mails SMTP/Mailpit ; pas de Resend                                               | **Fail**         |
| Analytics produit (events signup→pay)  | SDK live + consent          | Stub Amplitude, `consented=false`                                                  | **Fail**         |
| Error monitoring                       | SDK + filter global         | HTTP envelope Stripe only                                                          | **Fail**         |
| Admin MRR / CAC / LTV                  | Dashboard admin             | **N’existe pas**                                                                   | **Fail**         |
| Secrets / JWT / CORS                   | Pas de fallbacks dangereux  | Fallbacks `dev-*-secret-change-me`                                                 | **Fail**         |
| Endpoints sensibles protégés           | Auth + rôle                 | `POST /templates/seed` `@Public()`                                                 | **Fail**         |
| GDPR (privacy, export, delete réel)    | Pages + endpoints           | Soft-delete sans export ni cancel Stripe                                           | **Fail**         |
| Tests E2E des money flows              | Exécutés en CI              | Playwright `--list` + `continue-on-error`                                          | **Fail**         |
| Hébergement prod identifié             | Provider + env + backups    | Docker local OK ; Vercel **absent** ; K8s scaffold                                 | **Fail**         |
| TypeScript / build                     | 0 erreurs (non rejoué ici)  | CI `typecheck` + `build` existent ; claim « 0 errors » non revalidé dans cet audit | **Non prouvé**   |

Score GO : **4 / 14 critères durs**. Seuil recommandé : **12 / 14** + 0 P0 ouvert.

---

## 3. Risques si on ship anyway

| Risque                              | Probabilité   | Impact               | Scénario                                  |
| ----------------------------------- | ------------- | -------------------- | ----------------------------------------- |
| Mutation catalogue templates        | Haute         | Élevé                | Bot appelle `POST /api/v1/templates/seed` |
| DoS / SSRF via PDF                  | Haute         | Critique             | HTML public → Puppeteer                   |
| Bypass / session forgée             | Moyenne       | Critique             | Déploiement sans `JWT_ACCESS_SECRET`      |
| Charge après « suppression compte » | Haute         | Legal + finance      | `DELETE /users/me` ne touche pas Stripe   |
| Désync cancel                       | Haute         | Support / churn faux | Webhook force `cancelAtPeriodEnd: false`  |
| Lancement aveugle                   | Certaine      | Produit              | Aucun event signup/checkout capté         |
| Non-conformité GDPR                 | Certaine (UE) | Legal                | Pas de privacy policy, pas d’export       |
| Revenue leak                        | Moyenne       | Business             | Checkout error silencieux ; pas de portal |

Aucun de ces risques n’est « 6 minutes de config ».

---

## 4. Recommandation

### 4.1 Production publique — **NO-GO**

Ne pas `git push` vers un environnement public, ne pas pointer un domaine clients, ne pas activer Stripe **live**.

### 4.2 Closed beta (5–20 users internes) — **GO conditionnel**

Autorisé **uniquement si** les P0 suivants sont fermés :

1. Retirer `@Public()` de `POST /templates/seed` (dev-only / secret ops).
2. Authentifier `POST /cvs/export/pdf` **ou** le désactiver hors localhost.
3. Fail-fast au boot si JWT secrets sont les fallbacks `dev-*` et `NODE_ENV=production`.
4. `deleteMe` : cancel Stripe + revoke sessions (déjà) + anonymiser email.
5. Pages `/privacy` + `/terms` minimales avant toute collecte UE.
6. Stripe **test mode** uniquement ; pas de live keys.

### 4.3 Ce qui peut attendre **après** un beta interne

- PostHog/Amplitude SDK (mais **avant** acquisition payante).
- Admin MRR dashboard.
- Customer Portal + invoices UI.
- Rate-limit PDF plus strict, Lighthouse, dark-mode toggle.
- Marketplace, mobile, collab, growth loops.

### 4.4 Chemin critique réel

```
P0 sécurité (1–2 j)
  → billing loop fermé (invoices UI, portal, cancel, webhook cancel_at_period_end) (1–2 j)
    → legal GDPR min (privacy, export, delete) (1 j)
      → smoke signup → checkout test → webhook → plan Pro (0.5 j)
        → GO closed beta
          → 1–2 semaines stabilisation
            → GO public (soft launch)
```

Le brief « Today 15 min → production » **n’est pas le chemin critique**. C’est un anti-pattern.

---

## 5. Sign-off

| Rôle               | Nom | Date | Décision              | Commentaire   |
| ------------------ | --- | ---- | --------------------- | ------------- |
| Engineering        |     |      | NO-GO prod / GO beta* | *si P0 fermés |
| Product            |     |      |                       |               |
| Security / Privacy |     |      |                       |               |
| Business / Founder |     |      |                       |               |

\* Cocher une seule case par rôle : `GO prod` · `GO closed beta` · `NO-GO`.

**Décision audit (13 août 2026) :** NO-GO production. GO closed beta après P0.

Documents liés :

- [AUDIT_COMPLET.md](./AUDIT_COMPLET.md)
- [CHECKLIST_PRE_LANCEMENT.md](./CHECKLIST_PRE_LANCEMENT.md)
- [ACTION_PLAN.md](./ACTION_PLAN.md)
- [ROADMAP_OPTIMISEE.md](./ROADMAP_OPTIMISEE.md)
