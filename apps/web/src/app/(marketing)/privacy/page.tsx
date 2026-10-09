import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { CONTACTS, HOSTING, OPERATOR, missing } from '@/lib/legal';
import { LegalList, LegalPage, LegalSection, MailLink } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Politique de confidentialité',
  description:
    'Quelles données CV Studio AI traite, pourquoi, avec quels prestataires, combien de temps, et comment exercer vos droits.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      testId="legal-privacy-page"
      intro={
        <p>
          Cette page décrit les données personnelles que CV Studio AI traite lorsque vous utilisez
          le site et l’application, telles qu’elles ressortent du fonctionnement réel du service.
        </p>
      }
    >
      <LegalSection title="1. Responsable du traitement et contact">
        <p>
          Le responsable du traitement est {OPERATOR.name ?? missing('raison sociale')},{' '}
          {OPERATOR.address ?? missing('adresse')}.
        </p>
        <p>
          Pour toute question sur vos données ou pour exercer vos droits :{' '}
          <MailLink address={CONTACTS.privacy} />.
        </p>
      </LegalSection>

      <LegalSection title="2. Données traitées et leur origine">
        <p>
          Nous traitons uniquement les données que vous nous fournissez ou que génère votre usage :
        </p>
        <LegalList>
          <li>
            <strong>Compte</strong> (fourni par vous) : adresse e-mail, prénom, nom et mot de passe
            (stocké uniquement sous forme hachée). Ces informations sont obligatoires : sans elles,
            nous ne pouvons pas créer votre compte. Téléphone, localisation, présentation et photo
            de profil sont facultatifs.
          </li>
          <li>
            <strong>Connexion avec Google ou LinkedIn</strong> (si vous la choisissez) : nous
            recevons de ce service votre identifiant chez lui, votre adresse e-mail et votre nom.
          </li>
          <li>
            <strong>Contenu de vos CV</strong> : tout ce que vous saisissez dans l’éditeur
            (coordonnées, expériences, formations, compétences, langues, certifications, projets),
            les versions enregistrées, les rapports ATS et les offres d’emploi que vous y collez,
            vos portfolios. Évitez d’y indiquer des données sensibles (santé, opinions, religion…)
            ou des informations inutiles à une candidature.
          </li>
          <li>
            <strong>Intelligence artificielle</strong> : le texte que vous soumettez aux outils IA
            et les résultats proposés (voir section 4).
          </li>
          <li>
            <strong>Abonnement et paiements</strong> : formule, statut, dates de période et d’essai,
            montants, numéros de facture et identifiants client et abonnement chez Stripe. Vos
            données de carte bancaire sont saisies sur les pages de Stripe et ne sont jamais reçues
            ni stockées par nos serveurs.
          </li>
          <li>
            <strong>Sécurité et technique</strong> : adresse IP et navigateur (user-agent) des
            sessions de connexion et du journal de sécurité, dates de connexion, tentatives
            échouées, secret de double authentification (chiffré).
          </li>
          <li>
            <strong>Usage du produit</strong> : événements enregistrés dans notre base (par exemple
            inscription, connexion), avec la date et l’identifiant du compte. Avec votre accord
            seulement, mesure d’audience dans votre navigateur via PostHog (voir la{' '}
            <Link href="/cookie-policy" className="text-primary underline">
              politique cookies
            </Link>
            ).
          </li>
          <li>
            <strong>Pages publiques de CV</strong> : si vous publiez un CV, ses visites sont
            comptées à partir d’une empreinte de l’adresse IP et du navigateur du visiteur,
            renouvelée chaque jour ; ni l’adresse IP ni le navigateur ne sont conservés. Le site
            d’origine de la visite (nom de domaine) est enregistré.
          </li>
          <li>
            <strong>Marketplace</strong> (vendeurs et acheteurs de modèles) : profil vendeur (nom
            affiché, présentation, pays, lien de portfolio), achats, avis, litiges. La vérification
            d’identité des vendeurs et les versements sont réalisés par Stripe.
          </li>
          <li>
            <strong>Support</strong> : le contenu des messages que vous nous envoyez.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Finalités et bases juridiques">
        <LegalList>
          <li>
            Fournir le service (compte, édition et partage de CV, export PDF, outils IA, abonnement)
            : exécution du contrat.
          </li>
          <li>
            Facturer et conserver les pièces comptables : exécution du contrat et obligations
            légales.
          </li>
          <li>
            Sécuriser le service (prévention des fraudes et des abus, limitation de débit, journal
            de sécurité) : intérêt légitime à protéger les comptes et la plateforme.
          </li>
          <li>
            Mesurer l’usage du produit dans notre propre base, de manière agrégée, pour l’améliorer
            : intérêt légitime. Mesure d’audience PostHog dans le navigateur : consentement,
            retirable à tout moment.
          </li>
          <li>
            E-mails de service (vérification d’adresse, réinitialisation du mot de passe, échec de
            paiement, versement aux vendeurs) : exécution du contrat. Nous n’envoyons pas d’e-mails
            marketing.
          </li>
        </LegalList>
        <p>
          Ces bases juridiques sont celles du Règlement général sur la protection des données (RGPD)
          ; d’autres lois peuvent s’appliquer selon votre pays de résidence.
        </p>
      </LegalSection>

      <LegalSection title="4. Intelligence artificielle">
        <p>
          L’optimisation d’une ligne de CV peut être confiée à un fournisseur d’IA externe (OpenAI,
          États-Unis) lorsque cette option est activée sur le service. Seuls le texte de la ligne à
          reformuler, le ton choisi et, si vous la fournissez, l’offre d’emploi sont transmis ; le
          reste de votre CV et vos coordonnées de compte ne le sont pas. Les conditions de
          conservation et d’utilisation appliquées par ce fournisseur sont celles de son contrat API
          ; elles seront précisées ici après vérification{' '}
          {missing('conditions du fournisseur d’IA')}.
        </p>
        <p>
          Les autres outils (lettre de motivation, analyse ATS, adéquation à une offre, conseils,
          préparation d’entretien, suggestions de compétences) sont calculés sur nos serveurs, sans
          fournisseur externe.
        </p>
        <p>
          Les consignes données à l’IA lui interdisent d’inventer des employeurs, diplômes, dates,
          compétences ou résultats absents de vos informations. Les propositions peuvent néanmoins
          être inexactes : vérifiez-les avant de les utiliser. Les demandes et résultats IA sont
          conservés 7 jours, puis supprimés automatiquement.
        </p>
      </LegalSection>

      <LegalSection title="5. Destinataires et prestataires">
        <p>
          Vos données sont accessibles aux seules personnes de l’équipe qui en ont besoin pour
          exploiter le service. Nous ne vendons pas vos données. Elles sont transmises, pour ce qui
          les concerne, aux prestataires suivants :
        </p>
        <LegalList>
          <li>
            {HOSTING.provider} : hébergement de l’application et des bases de données (
            {HOSTING.location}).
          </li>
          <li>Stripe : paiements, factures, abonnements et versements aux vendeurs.</li>
          <li>OpenAI : optimisation de lignes de CV, si l’option est activée (voir section 4).</li>
          <li>PostHog : mesure d’audience, uniquement avec votre accord.</li>
          <li>Sentry : détection des erreurs techniques, sans contenu de CV.</li>
          <li>Google, LinkedIn : connexion, uniquement si vous l’utilisez.</li>
          <li>Prestataire d’envoi d’e-mails : {missing('nom du relais SMTP de production')}.</li>
        </LegalList>
        <p>
          Les CV que vous partagez avec une équipe (formule Business) sont visibles par ses membres
          ; un CV publié est visible par toute personne disposant du lien.
        </p>
      </LegalSection>

      <LegalSection title="6. Transferts hors de l’Union européenne">
        <p>
          L’hébergement principal est situé dans l’Union européenne. Certains prestataires (OpenAI,
          PostHog, Sentry, Stripe, Google, LinkedIn) peuvent traiter des données aux États-Unis ou
          dans d’autres pays. Les garanties encadrant ces transferts (clauses contractuelles types
          de la Commission européenne ou équivalent) sont{' '}
          {missing('garanties de transfert vérifiées pour chaque prestataire')}.
        </p>
      </LegalSection>

      <LegalSection title="7. Durées de conservation">
        <LegalList>
          <li>Compte et profil : tant que le compte existe.</li>
          <li>
            CV supprimés depuis le tableau de bord : retirés de l’application et des pages publiques
            (le cache des pages publiques peut les montrer jusqu’à une minute), mais conservés en
            base jusqu’à la suppression du compte {missing('durée de purge des CV supprimés')}.
          </li>
          <li>Demandes et résultats IA : 7 jours.</li>
          <li>
            Fichiers PDF : générés à la demande, jamais stockés ; une copie temporaire reste en
            mémoire serveur 15 minutes au plus.
          </li>
          <li>
            Journal de sécurité, sessions de connexion et événements d’usage :{' '}
            {missing('durée de conservation')}.
          </li>
          <li>
            Factures et paiements : pendant la durée imposée par les obligations comptables et
            fiscales {missing('durée légale applicable')}.
          </li>
          <li>
            Sauvegardes des bases de données : selon le cycle de l’hébergeur{' '}
            {missing('durée de rétention des sauvegardes')}.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Suppression du compte">
        <p>
          Vous pouvez supprimer votre compte depuis{' '}
          <Link href="/account/settings?tab=privacy" className="text-primary underline">
            Paramètres › Confidentialité
          </Link>
          , après confirmation par votre mot de passe (ou votre adresse e-mail si vous vous
          connectez avec Google ou LinkedIn). La suppression :
        </p>
        <LegalList>
          <li>
            efface vos CV, versions, rapports ATS, historique IA, portfolios, notifications,
            sessions, comptes Google ou LinkedIn liés, appartenances aux équipes ;
          </li>
          <li>
            résilie immédiatement un abonnement en cours, sans remboursement automatique de la
            période restante ;
          </li>
          <li>
            anonymise votre profil (nom, e-mail, téléphone, etc.) et détache de votre personne les
            événements d’usage ;
          </li>
          <li>
            conserve, rattachés au compte anonymisé, les paiements, factures, achats de la
            marketplace et le journal de sécurité, pour nos obligations légales et la défense de nos
            droits.
          </li>
        </LegalList>
        <p>
          Les données détenues par nos prestataires (par exemple le dossier client chez Stripe) ne
          sont pas supprimées automatiquement : écrivez-nous pour en demander l’effacement lorsque
          la loi le permet.
        </p>
      </LegalSection>

      <LegalSection title="9. Sécurité">
        <p>
          Connexions chiffrées (HTTPS), mots de passe hachés, double authentification facultative,
          secrets chiffrés, sessions révocables, limitation du nombre de requêtes, bases de données
          accessibles uniquement depuis le réseau privé de l’hébergement. Aucune mesure ne garantit
          une sécurité absolue ; en cas de violation de données, nous appliquerons les obligations
          de notification prévues par la loi.
        </p>
      </LegalSection>

      <LegalSection title="10. Vos droits">
        <LegalList>
          <li>
            Accès et portabilité : <em>Paramètres › Confidentialité › Télécharger mes données</em>{' '}
            (fichier JSON).
          </li>
          <li>Rectification : depuis votre profil et l’éditeur de CV.</li>
          <li>Effacement : suppression du compte (section 8).</li>
          <li>
            Retrait du consentement à la mesure d’audience : lien « Préférences cookies » en bas de
            page.
          </li>
          <li>
            Opposition, limitation, ou toute autre demande : écrivez à{' '}
            <MailLink address={CONTACTS.privacy} />. Nous pourrons vous demander de confirmer votre
            identité. Nous répondons dans les délais prévus par la loi applicable (un mois sous le
            RGPD).
          </li>
        </LegalList>
        <p>
          Vous pouvez introduire une réclamation auprès de l’autorité de protection des données
          compétente, par exemple la CNIL en France ou l’ARTCI en Côte d’Ivoire.
        </p>
      </LegalSection>

      <LegalSection title="11. Âge minimum">
        <p>
          Le service n’est pas destiné aux personnes de moins de{' '}
          {OPERATOR.minimumAge ? `${OPERATOR.minimumAge} ans` : missing('âge minimum')}.
        </p>
      </LegalSection>

      <LegalSection title="12. Modifications">
        <p>
          Nous mettrons cette politique à jour lorsque le service ou nos prestataires changent. La
          date de dernière mise à jour figure en haut de la page ; en cas de changement important,
          nous vous en informerons par e-mail ou dans l’application.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
