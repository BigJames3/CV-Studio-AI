import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { CONTACTS, missing } from '@/lib/legal';
import { LegalList, LegalPage, LegalSection, MailLink } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Conditions d’abonnement',
  description:
    'Prix, paiement prépayé, prolongation, changement de formule, fin de période et facturation des formules CV Studio AI.',
  path: '/subscription-terms',
});

export default function SubscriptionTermsPage() {
  return (
    <LegalPage
      title="Conditions d’abonnement"
      testId="legal-subscription-terms-page"
      intro={
        <p>
          Ces conditions complètent les{' '}
          <Link href="/terms" className="text-primary underline">
            conditions d’utilisation
          </Link>{' '}
          pour les formules payantes. Les paiements sont traités par Paystack (Orange Money, MTN
          Mobile Money, Wave ou carte bancaire).
        </p>
      }
    >
      <LegalSection title="1. Formules et prix">
        <LegalList>
          <li>Free : gratuit, sans moyen de paiement.</li>
          <li>Pro : 6 600 F CFA pour un mois ou 65 000 F CFA pour un an.</li>
          <li>Business : 19 700 F CFA pour un mois ou 196 200 F CFA pour un an.</li>
        </LegalList>
        <p>
          Prix en francs CFA (XOF), {missing('régime de TVA : prix TTC ou HT, TVA applicable')}. Le
          contenu de chaque formule est décrit sur la page{' '}
          <Link href="/pricing" className="text-primary underline">
            Tarifs
          </Link>
          . Le montant exact est rappelé sur la page de paiement Paystack avant toute validation.
        </p>
      </LegalSection>

      <LegalSection title="2. Paiement prépayé, sans renouvellement automatique">
        <LegalList>
          <li>
            Chaque paiement est unique et achète une période d’accès d’un mois ou d’un an, calculée
            à partir de la date du paiement. Aucun moyen de paiement n’est enregistré et rien n’est
            prélevé automatiquement par la suite.
          </li>
          <li>
            Aucun essai gratuit n’est proposé : la formule Free reste disponible sans paiement.
          </li>
          <li>
            La formule est active dès que Paystack confirme le paiement, en général quelques
            instants après sa validation.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Fin de période et prolongation">
        <LegalList>
          <li>
            La date de fin de votre période est indiquée dans{' '}
            <Link href="/account/billing" className="text-primary underline">
              Compte › Facturation
            </Link>
            . Un rappel vous est envoyé par e-mail 7 jours avant cette date.
          </li>
          <li>
            Pour garder votre formule, payez une nouvelle période depuis cette page, à tout moment :
            la nouvelle période s’ajoute à la date de fin en cours, sans perte de jours.
          </li>
          <li>
            Sans nouveau paiement, le compte repasse en Free à la date de fin. Vos CV sont conservés
            ; les limites de la formule Free s’appliquent de nouveau.
          </li>
          <li>
            Il n’y a rien à résilier. La suppression du compte met fin immédiatement à la période en
            cours. Une période commencée n’est pas remboursée automatiquement : voir la{' '}
            <Link href="/refund-policy" className="text-primary underline">
              politique de remboursement
            </Link>
            .
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Changement de formule">
        <p>
          Pour changer de formule (par exemple Pro vers Business, ou Business vers Pro), payez une
          période de la nouvelle formule. Elle s’applique dès la confirmation du paiement. Le temps
          non utilisé de la formule précédente est converti, au prorata du prix mensuel des deux
          formules, en jours supplémentaires sur la nouvelle : passer à Business raccourcit ce
          crédit, passer à Pro l’allonge. Ce crédit n’est jamais versé en argent.
        </p>
      </LegalSection>

      <LegalSection title="5. Paiement échoué ou abandonné">
        <p>
          Si un paiement échoue ou si vous quittez la page de paiement, rien n’est débité et votre
          formule actuelle ne change pas. Vous pouvez réessayer à tout moment.
        </p>
      </LegalSection>

      <LegalSection title="6. Factures">
        <p>
          L’historique de vos paiements et de vos factures est disponible dans{' '}
          <Link href="/account/billing" className="text-primary underline">
            Compte › Facturation
          </Link>
          . Paystack peut aussi envoyer un reçu à l’adresse e-mail du compte après chaque paiement.
        </p>
      </LegalSection>

      <LegalSection title="7. Droit de rétractation">
        <p>
          Si vous êtes un consommateur, vous pouvez disposer d’un droit de rétractation selon la loi
          de votre pays. Ses modalités pour ce service, notamment lorsque la période payée a
          commencé à votre demande, sont{' '}
          {missing('modalités du droit de rétractation validées juridiquement')}. Voir aussi la{' '}
          <Link href="/refund-policy" className="text-primary underline">
            politique de remboursement
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Contact facturation">
        <p>
          <MailLink address={CONTACTS.billing} />
        </p>
      </LegalSection>
    </LegalPage>
  );
}
