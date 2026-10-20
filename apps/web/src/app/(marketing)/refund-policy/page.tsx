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
      <LegalSection title="1. Formules prépayées">
        <p>
          Pro et Business se paient à l’avance, pour un mois ou un an, et ne se renouvellent pas
          automatiquement : l’accès continue jusqu’à la fin de la période payée, puis le compte
          repasse en Free (voir les{' '}
          <Link href="/subscription-terms" className="text-primary underline">
            conditions d’abonnement
          </Link>
          ). Ne pas prolonger ne déclenche aucun remboursement d’une période commencée. Un
          remboursement s’obtient sur demande, dans les cas ci-dessous.
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
            <strong>Autres demandes</strong> (par exemple une période payée par erreur) : examinées
            au cas par cas, sans garantie de remboursement d’une période commencée.
          </li>
        </LegalList>
        <p>
          Lors d’un changement de formule, le temps non utilisé est converti en jours sur la
          nouvelle formule : ce crédit n’est pas versé en argent.
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
          Indiquez si possible la référence de transaction Paystack. N’envoyez jamais votre numéro
          de carte, son code de sécurité, une photo de votre carte ni votre code Mobile Money : nous
          n’en avons pas besoin. Délai de réponse :{' '}
          {missing('délai de réponse que l’équipe peut tenir')}.
        </p>
      </LegalSection>

      <LegalSection title="4. Versement du remboursement">
        <p>
          Un remboursement accepté est effectué par Paystack sur le moyen de paiement utilisé (carte
          bancaire ou compte Mobile Money). Le délai d’apparition dépend de votre banque ou de votre
          opérateur. Il peut être total ou partiel selon le cas.
        </p>
      </LegalSection>

      <LegalSection title="5. Paiement échoué ou contesté">
        <LegalList>
          <li>
            Un paiement échoué ou abandonné n’est pas débité : aucun remboursement n’est nécessaire
            et votre formule actuelle ne change pas.
          </li>
          <li>
            Si vous contestez un paiement auprès de votre banque ou de votre opérateur, la procédure
            est menée par Paystack et votre banque ou opérateur ; nous leur transmettons les
            justificatifs. Contactez-nous d’abord : la plupart des problèmes se règlent plus vite
            directement.
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
