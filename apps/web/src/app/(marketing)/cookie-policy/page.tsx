import { createPageMetadata } from '@/lib/seo';
import { CookiePreferencesButton } from '@/components/analytics/cookie-preferences-button';
import { LegalList, LegalPage, LegalSection } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Politique cookies',
  description: 'Cookies et stockages utilisés par CV Studio AI, et comment gérer votre choix.',
  path: '/cookie-policy',
});

type Row = { name: string; kind: string; purpose: string; lifetime: string };

const NECESSARY: Row[] = [
  {
    name: 'refresh_token',
    kind: 'Cookie HttpOnly (CV Studio AI)',
    purpose: 'Maintenir votre session de connexion de façon sécurisée',
    lifetime: '7 jours',
  },
  {
    name: 'cv_session',
    kind: 'Cookie (CV Studio AI)',
    purpose: 'Indiquer qu’une session est ouverte, pour diriger vers les bonnes pages',
    lifetime: '7 jours',
  },
  {
    name: 'cv_account, cv_logout_at',
    kind: 'localStorage',
    purpose: 'Synchroniser connexion et déconnexion entre vos onglets',
    lifetime: 'Jusqu’à la prochaine connexion ou déconnexion',
  },
  {
    name: 'cv_analytics_consent, cv_analytics_consent_at',
    kind: 'localStorage',
    purpose: 'Mémoriser votre choix sur la mesure d’audience et sa date',
    lifetime: '13 mois, puis le choix vous est redemandé',
  },
  {
    name: 'cv-draft-…',
    kind: 'sessionStorage',
    purpose: 'Brouillon de l’éditeur de CV en cas de rechargement',
    lifetime: 'Fermeture de l’onglet',
  },
  {
    name: 'oauth_next, oauth_temp_token',
    kind: 'sessionStorage',
    purpose: 'Terminer une connexion avec Google ou LinkedIn',
    lifetime: 'Fermeture de l’onglet (supprimés après connexion)',
  },
  {
    name: 'cv-view-…',
    kind: 'sessionStorage',
    purpose: 'Ne compter qu’une fois la visite d’un CV public par onglet',
    lifetime: 'Fermeture de l’onglet',
  },
];

const ANALYTICS: Row[] = [
  {
    name: 'ph_<clé>_posthog, __ph_opt_in_out_<clé>',
    kind: 'Cookie et localStorage (PostHog)',
    purpose: 'Mesure d’audience : pages vues et étapes clés (inscription, paiement)',
    lifetime: '1 an (valeur par défaut de PostHog)',
  },
  {
    name: 'cv_sid',
    kind: 'sessionStorage',
    purpose: 'Regrouper les événements d’une même visite',
    lifetime: 'Fermeture de l’onglet',
  },
];

function CookieTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-content-primary">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Nom
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Type
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Finalité
            </th>
            <th scope="col" className="py-2 font-semibold">
              Durée
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-border align-top">
              <td className="py-2 pr-3 font-mono text-xs">{row.name}</td>
              <td className="py-2 pr-3">{row.kind}</td>
              <td className="py-2 pr-3">{row.purpose}</td>
              <td className="py-2">{row.lifetime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Politique cookies"
      testId="legal-cookie-policy-page"
      intro={
        <p>
          Cette liste reprend les cookies et stockages du navigateur que le code de CV Studio AI
          utilise. Elle ne couvre pas les cookies déposés par des services tiers sur leurs propres
          pages (par exemple la page de paiement Stripe).
        </p>
      }
    >
      <LegalSection title="1. Strictement nécessaires">
        <p>
          Indispensables au fonctionnement du service ou demandés par vous : ils ne nécessitent pas
          de consentement et ne peuvent pas être désactivés depuis nos préférences.
        </p>
        <CookieTable rows={NECESSARY} />
      </LegalSection>

      <LegalSection title="2. Mesure d’audience (avec votre accord)">
        <p>
          PostHog n’est chargé qu’après votre accord, et seulement lorsque la mesure d’audience est
          activée sur le site. Si vous refusez, aucun de ces éléments n’est créé ; si vous retirez
          votre accord, ils sont supprimés de votre navigateur. Aucun contenu de CV n’est envoyé à
          PostHog.
        </p>
        <CookieTable rows={ANALYTICS} />
      </LegalSection>

      <LegalSection title="3. Services tiers">
        <LegalList>
          <li>
            Connexion avec Google : lorsque cette option est active, les pages de connexion et
            d’inscription chargent le script de Google, qui peut déposer ses propres cookies selon
            la politique de Google.
          </li>
          <li>
            Paiement : la saisie de la carte a lieu sur les pages de Stripe, qui appliquent leur
            propre politique cookies.
          </li>
          <li>
            Sentry (détection des erreurs) ne dépose pas de cookie ; il reçoit des informations
            techniques sur les erreurs, sans contenu de CV.
          </li>
        </LegalList>
        <p>Nous n’utilisons aucun cookie publicitaire ni de réseau social.</p>
      </LegalSection>

      <LegalSection title="4. Gérer votre choix">
        <p>
          Vous pouvez accepter, refuser ou retirer votre accord à tout moment, aussi simplement que
          vous l’avez donné :
        </p>
        <CookiePreferencesButton className="font-medium text-primary underline" />
        <p>
          Vous pouvez aussi supprimer les cookies et le stockage du site depuis les réglages de
          votre navigateur ; vous serez alors déconnecté et le choix vous sera redemandé.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
