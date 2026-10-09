import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { CONTACTS, missing } from '@/lib/legal';
import { LegalList, LegalPage, LegalSection, MailLink } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Politique de remboursement',
  description: 'Quand et comment demander un remboursement d’un paiement CV Studio AI.',
  path: '/refund-policy',
});

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Politique de remboursement"
      testId="legal-refund-policy-page"
      intro={
        <p>
          Cette politique s’applique aux abonnements Pro et Business et aux achats de modèles sur la
          marketplace. Elle ne réduit pas les droits que la loi de votre pays vous accorde en tant
          que consommateur. {missing('politique commerciale validée par l’exploitant')}
        </p>
      }
    >
      <LegalSection title="1. Résiliation et remboursement : deux choses différentes">
        <p>
          Résilier arrête les renouvellements futurs ; l’accès continue jusqu’à la fin de la période
          payée (voir les{' '}
          <Link href="/subscription-terms" className="text-primary underline">
            conditions d’abonnement
          </Link>
          ). Une résiliation ne déclenche pas de remboursement automatique. Un remboursement
          s’obtient sur demande, dans les cas ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title="2. Cas de remboursement">
        <LegalList>
          <li>
            <strong>Paiement en double ou erreur de facturation</strong> : remboursement intégral du
            montant indûment prélevé.
          </li>
          <li>
            <strong>Droit de rétractation</strong> : lorsqu’il s’applique, selon les modalités
            décrites dans les conditions d’abonnement.
          </li>
          <li>
            <strong>Service indisponible ou défaillant de notre fait</strong> : remboursement total
            ou partiel, examiné au cas par cas.
          </li>
          <li>
            <strong>Autres demandes</strong> (par exemple un renouvellement oublié) : examinées au
            cas par cas, sans garantie de remboursement d’une période commencée.
          </li>
        </LegalList>
        <p>
          L’essai gratuit ne donne lieu à aucun prélèvement : résiliez avant sa fin pour ne rien
          payer. Un crédit de changement de formule est déduit des factures suivantes, il n’est pas
          versé sur la carte.
        </p>
      </LegalSection>

      <LegalSection title="3. Faire une demande">
        <p>
          Écrivez à <MailLink address={CONTACTS.billing} /> depuis l’adresse de votre compte, en
          indiquant :
        </p>
        <LegalList>
          <li>l’adresse e-mail du compte ;</li>
          <li>la date et le montant du paiement, ou le numéro de facture ;</li>
          <li>le motif de la demande.</li>
        </LegalList>
        <p>
          N’envoyez jamais votre numéro de carte, son code de sécurité ou une photo de votre carte :
          nous n’en avons pas besoin. Délai de réponse :{' '}
          {missing('délai de réponse que l’équipe peut tenir')}.
        </p>
      </LegalSection>

      <LegalSection title="4. Versement du remboursement">
        <p>
          Un remboursement accepté est effectué par Stripe sur le moyen de paiement utilisé. Le
          délai d’apparition sur votre compte dépend de votre banque (Stripe indique généralement 5
          à 10 jours ouvrés). Il peut être total ou partiel selon le cas.
        </p>
      </LegalSection>

      <LegalSection title="5. Paiement échoué ou contesté">
        <LegalList>
          <li>
            Un paiement échoué n’est pas prélevé : aucun remboursement n’est nécessaire. Voir les
            conditions d’abonnement pour la suite (nouvelles tentatives, maintien de l’accès 7
            jours).
          </li>
          <li>
            Si vous contestez un paiement auprès de votre banque, la procédure est menée par Stripe
            et votre banque ; nous leur transmettons les justificatifs. Contactez-nous d’abord : la
            plupart des problèmes se règlent plus vite directement.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Achats sur la marketplace">
        <p>
          Les modèles achetés sur la marketplace sont des contenus numériques livrés immédiatement.
          Pour un modèle défectueux, non conforme à sa description ou acheté en double, contactez{' '}
          <MailLink address={CONTACTS.support} />.{' '}
          {missing('règles de remboursement de la marketplace')}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
