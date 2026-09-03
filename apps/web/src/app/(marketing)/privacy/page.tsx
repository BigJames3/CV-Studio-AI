import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Politique de confidentialité',
  description:
    'Comment CV Studio AI collecte, utilise et protège vos données personnelles (RGPD / CCPA).',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-content px-4 py-16" data-testid="legal-privacy-page">
      <h1 className="text-4xl font-semibold">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-content-secondary">Dernière mise à jour : 16 août 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-content-secondary">
        <section>
          <h2 className="text-xl font-semibold text-content-primary">
            1. Responsable du traitement
          </h2>
          <p className="mt-2">
            CV Studio AI est le responsable du traitement des données collectées via ce service.
            Contact confidentialité :{' '}
            <a className="text-primary underline" href="mailto:privacy@cvstudio.ai">
              privacy@cvstudio.ai
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">2. Données collectées</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Compte : e-mail, nom, téléphone, localisation, photo de profil</li>
            <li>
              CV : contenu que vous saisissez ou importez (expérience, formation, compétences)
            </li>
            <li>Paiements : identifiants Stripe / CinetPay (pas de numéro de carte)</li>
            <li>Usage : journaux techniques (IP, user-agent, horodatage) pour la sécurité</li>
            <li>IA : extraits de CV envoyés au fournisseur d’IA pour générer des suggestions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">
            3. Finalités et bases légales
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Exécution du contrat : compte, édition de CV, export PDF, facturation</li>
            <li>Intérêt légitime : sécurité, prévention de la fraude, journaux d’audit</li>
            <li>
              Consentement : e-mails marketing, géolocalisation pour suggérer un moyen de paiement
            </li>
            <li>Obligation légale : conservation des factures</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">4. Destinataires</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Stripe : paiements par carte (données carte hors de notre base)</li>
            <li>CinetPay : paiements mobile money en Afrique</li>
            <li>
              Fournisseurs d’IA (OpenAI ou équivalent) : génération de contenu, sans entraînement
              sur vos données lorsque le contrat le permet
            </li>
            <li>Sentry / PostHog : erreurs et analytics, sans corps de CV</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">5. Conservation</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Compte et CV actifs : durée d’utilisation du service</li>
            <li>
              Après suppression du compte : données CV / IA / sessions effacées immédiatement ;
              factures conservées pour obligations comptables
            </li>
            <li>Historique IA : 7 jours puis purge automatique</li>
            <li>Journaux de sécurité : jusqu’à 24 mois</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">
            6. Vos droits (RGPD / CCPA)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Accès et portabilité : export JSON via GET /api/v1/users/me/export (compte connecté)
            </li>
            <li>Rectification : paramètres du compte et éditeur de CV</li>
            <li>Effacement : suppression du compte (annule aussi l’abonnement)</li>
            <li>Opposition / retrait du consentement : paramètres confidentialité</li>
            <li>
              Californie : nous ne vendons pas vos données personnelles (CCPA « Do Not Sell »)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">7. Sécurité</h2>
          <p className="mt-2">
            TLS en transit, hachage des mots de passe, chiffrement des secrets 2FA, sessions
            révocables, limitation de débit. Aucune garantie de sécurité absolue.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">8. Contact</h2>
          <p className="mt-2">
            Délégué à la protection des données :{' '}
            <a className="text-primary underline" href="mailto:privacy@cvstudio.ai">
              privacy@cvstudio.ai
            </a>
            . Réclamations : autorité de contrôle compétente (CNIL ou équivalent).
          </p>
        </section>
      </div>
    </article>
  );
}
