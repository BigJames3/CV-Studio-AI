import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { CONTACTS, OPERATOR, missing } from '@/lib/legal';
import { LegalList, LegalPage, LegalSection, MailLink } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Conditions d’utilisation',
  description: 'Conditions d’utilisation du service CV Studio AI.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d’utilisation" testId="legal-terms-page">
      <LegalSection title="1. Objet">
        <p>
          Ces conditions régissent l’utilisation de CV Studio AI, service en ligne de création,
          d’optimisation, d’export et de partage de CV, édité par{' '}
          {OPERATOR.name ?? missing('raison sociale')} (voir les{' '}
          <Link href="/legal-notice" className="text-primary underline">
            mentions légales
          </Link>
          ). Les formules payantes sont en outre soumises aux{' '}
          <Link href="/subscription-terms" className="text-primary underline">
            conditions d’abonnement
          </Link>
          . Le traitement de vos données est décrit dans la{' '}
          <Link href="/privacy" className="text-primary underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <p>
          Vous acceptez ces conditions en créant un compte. Elles ne privent pas les consommateurs
          des droits que leur accorde la loi de leur pays de résidence.
        </p>
      </LegalSection>

      <LegalSection title="2. Compte">
        <LegalList>
          <li>
            Le service est réservé aux personnes âgées d’au moins{' '}
            {OPERATOR.minimumAge ? `${OPERATOR.minimumAge} ans` : missing('âge minimum')}.
          </li>
          <li>
            Vous fournissez des informations exactes et gardez vos identifiants confidentiels.
            Activez la double authentification si possible et signalez-nous tout accès suspect.
          </li>
          <li>Vous êtes responsable de l’usage fait de votre compte.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Utilisation autorisée">
        <p>Il est interdit :</p>
        <LegalList>
          <li>
            de présenter dans un CV des diplômes, expériences ou compétences inventés, ou d’usurper
            l’identité d’une autre personne ;
          </li>
          <li>
            de publier des contenus illicites, diffamatoires ou portant atteinte aux droits d’autrui
            ;
          </li>
          <li>
            de tenter d’accéder aux données d’autres utilisateurs, de contourner les limites des
            formules ou les quotas, ou de perturber le service (requêtes automatisées massives,
            exports abusifs) ;
          </li>
          <li>d’insérer des données personnelles de tiers sans droit de le faire.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Vos contenus">
        <p>
          Vous restez propriétaire des contenus que vous saisissez ou importez. Vous nous accordez
          le droit de les héberger, de les traiter et de les afficher dans la seule mesure
          nécessaire pour fournir le service (édition, export, partage que vous déclenchez, outils
          IA). Vous garantissez disposer des droits sur ces contenus.
        </p>
        <p>
          Un CV publié est accessible à toute personne disposant du lien, jusqu’à ce que vous le
          retiriez de la publication ou le supprimiez.
        </p>
      </LegalSection>

      <LegalSection title="5. Intelligence artificielle">
        <p>
          Les outils IA proposent des reformulations, lettres, analyses et conseils à partir de vos
          informations. Ils sont conçus pour ne pas inventer de faits, mais leurs propositions
          peuvent être inexactes, incomplètes ou inadaptées. Vous restez seul responsable du contenu
          final de vos CV et lettres : relisez et corrigez chaque proposition avant de l’utiliser.
        </p>
        <p>
          CV Studio AI ne garantit ni l’obtention d’un entretien ou d’un emploi, ni un score
          particulier auprès d’un logiciel de recrutement (ATS).
        </p>
      </LegalSection>

      <LegalSection title="6. Formules gratuites et payantes">
        <p>
          La formule Free est gratuite et limitée ; les formules Pro et Business donnent accès à
          davantage de CV et de fonctionnalités. Le contenu et les limites de chaque formule sont
          décrits sur la page{' '}
          <Link href="/pricing" className="text-primary underline">
            Tarifs
          </Link>
          . Prix, essai, renouvellement, résiliation et remboursements relèvent des{' '}
          <Link href="/subscription-terms" className="text-primary underline">
            conditions d’abonnement
          </Link>{' '}
          et de la{' '}
          <Link href="/refund-policy" className="text-primary underline">
            politique de remboursement
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilité du service">
        <p>
          Nous faisons nos meilleurs efforts pour que le service soit disponible et sécurisé, sans
          pouvoir garantir une disponibilité permanente. Des interruptions peuvent avoir lieu pour
          maintenance, mise à jour ou incident ; nous informons des maintenances planifiées lorsque
          c’est possible. Conservez une copie de vos documents importants (export PDF ou
          téléchargement de vos données).
        </p>
      </LegalSection>

      <LegalSection title="8. Suspension et fermeture">
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis{' '}
          <Link href="/account/settings?tab=privacy" className="text-primary underline">
            Paramètres › Confidentialité
          </Link>
          . Nous pouvons suspendre ou fermer un compte en cas de manquement grave à ces conditions
          ou à la loi, après vous en avoir informé sauf urgence (fraude, sécurité, obligation
          légale).
        </p>
      </LegalSection>

      <LegalSection title="9. Propriété intellectuelle de CV Studio AI">
        <p>
          La plateforme, son code, sa marque, ses modèles de CV et sa documentation restent notre
          propriété ou celle de nos concédants. Les modèles de la marketplace appartiennent à leurs
          vendeurs et sont utilisables selon la licence acquise.
        </p>
      </LegalSection>

      <LegalSection title="10. Responsabilité">
        <p>
          Dans les limites permises par la loi applicable, notre responsabilité ne couvre pas les
          dommages indirects ni les décisions prises par des tiers (recruteurs, employeurs) sur la
          base de vos documents. Rien dans ces conditions n’exclut notre responsabilité lorsque la
          loi l’interdit, notamment en cas de faute lourde ou intentionnelle, ni les garanties
          légales dues aux consommateurs.
        </p>
      </LegalSection>

      <LegalSection title="11. Modification des conditions">
        <p>
          Nous pouvons faire évoluer ces conditions. Les changements importants vous sont annoncés
          par e-mail ou dans l’application avant leur entrée en vigueur ; si vous les refusez, vous
          pouvez supprimer votre compte et résilier votre abonnement.
        </p>
      </LegalSection>

      <LegalSection title="12. Droit applicable et litiges">
        <p>
          {OPERATOR.governingLaw ?? missing('droit applicable et juridiction compétente')}. En cas
          de litige, contactez-nous d’abord à <MailLink address={CONTACTS.legal} /> pour chercher
          une solution amiable. Les consommateurs conservent le droit de saisir les juridictions et
          les dispositifs de médiation prévus par la loi de leur pays.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Support : <MailLink address={CONTACTS.support} />. Questions juridiques :{' '}
          <MailLink address={CONTACTS.legal} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
