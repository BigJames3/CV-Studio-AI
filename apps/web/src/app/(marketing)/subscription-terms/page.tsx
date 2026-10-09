import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { CONTACTS, missing } from '@/lib/legal';
import { LegalList, LegalPage, LegalSection, MailLink } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Conditions d’abonnement',
  description:
    'Prix, essai gratuit, renouvellement, changement de formule, résiliation et facturation des abonnements CV Studio AI.',
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
          pour les formules payantes. Les paiements sont traités par Stripe.
        </p>
      }
    >
      <LegalSection title="1. Formules et prix">
        <LegalList>
          <li>Free : gratuit, sans moyen de paiement.</li>
          <li>Pro : 9,99 € par mois ou 99 € par an.</li>
          <li>Business : 29,99 € par mois ou 299 € par an.</li>
        </LegalList>
        <p>
          Prix en euros, {missing('régime de TVA : prix TTC ou HT, TVA applicable')}. Le contenu de
          chaque formule est décrit sur la page{' '}
          <Link href="/pricing" className="text-primary underline">
            Tarifs
          </Link>
          . Le montant exact est rappelé sur la page de paiement Stripe avant toute validation.
        </p>
      </LegalSection>

      <LegalSection title="2. Essai gratuit de 14 jours">
        <LegalList>
          <li>
            Un essai gratuit de 14 jours est proposé lors du premier abonnement à Pro ou Business.
            Il n’est accordé qu’une seule fois par compte ; un changement de formule pendant l’essai
            n’en ouvre pas un nouveau.
          </li>
          <li>
            Une carte bancaire est demandée au début de l’essai. Rien n’est prélevé pendant l’essai.
          </li>
          <li>
            À la fin de l’essai, l’abonnement choisi démarre et le premier paiement (mensuel ou
            annuel) est prélevé automatiquement, sauf si vous avez résilié avant. Sans moyen de
            paiement valide à cette date, l’abonnement est annulé et le compte repasse en Free.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Renouvellement">
        <p>
          L’abonnement est sans engagement de durée et se renouvelle automatiquement à la fin de
          chaque période (mois ou année), au prix en vigueur, jusqu’à sa résiliation. Toute hausse
          de prix vous sera annoncée avant de s’appliquer à votre renouvellement.
        </p>
      </LegalSection>

      <LegalSection title="4. Résiliation">
        <LegalList>
          <li>
            Vous résiliez à tout moment depuis{' '}
            <Link href="/account/billing" className="text-primary underline">
              Compte › Facturation
            </Link>{' '}
            (bouton d’annulation, puis confirmation).
          </li>
          <li>
            La résiliation prend effet à la fin de la période en cours : vous gardez l’accès à votre
            formule jusqu’à cette date, puis le compte repasse en Free. Vos CV sont conservés ; les
            limites de la formule Free s’appliquent de nouveau.
          </li>
          <li>
            Pour revenir sur une résiliation avant la fin de la période, sans nouveau paiement,
            écrivez au support.
          </li>
          <li>
            La suppression du compte résilie l’abonnement immédiatement, sans attendre la fin de la
            période.
          </li>
          <li>
            La résiliation n’entraîne pas, à elle seule, de remboursement : voir la{' '}
            <Link href="/refund-policy" className="text-primary underline">
              politique de remboursement
            </Link>
            .
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Changement de formule">
        <LegalList>
          <li>
            Passage à une formule supérieure (par exemple Pro vers Business, ou mensuel vers annuel)
            : immédiat. La différence au prorata de la période restante est facturée aussitôt. Si ce
            paiement nécessite une authentification ou échoue, l’ancienne formule reste active
            jusqu’au paiement.
          </li>
          <li>
            Passage à une formule inférieure : immédiat. La part non utilisée de la formule
            précédente est créditée et déduite de vos prochaines factures ; elle n’est pas
            remboursée sur votre carte.
          </li>
          <li>Pendant l’essai gratuit, un changement de formule n’entraîne aucun prorata.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Paiement échoué">
        <p>
          Si un renouvellement ne peut pas être prélevé, Stripe tente à nouveau le paiement et nous
          vous prévenons par e-mail pour que vous mettiez à jour votre moyen de paiement. Votre
          accès est maintenu pendant 7 jours après l’échec ; passé ce délai sans paiement, le compte
          repasse en Free jusqu’à régularisation.
        </p>
      </LegalSection>

      <LegalSection title="7. Factures">
        <p>
          Une facture est émise par Stripe pour chaque paiement. Vous la retrouvez dans{' '}
          <Link href="/account/billing" className="text-primary underline">
            Compte › Facturation
          </Link>{' '}
          (historique et portail « Gérer mon paiement et mes factures », où vous pouvez aussi
          changer de carte).
        </p>
      </LegalSection>

      <LegalSection title="8. Droit de rétractation">
        <p>
          Si vous êtes un consommateur, vous pouvez disposer d’un droit de rétractation selon la loi
          de votre pays. Ses modalités pour ce service, notamment lorsque l’essai gratuit ou
          l’abonnement a commencé à votre demande, sont{' '}
          {missing('modalités du droit de rétractation validées juridiquement')}. Voir aussi la{' '}
          <Link href="/refund-policy" className="text-primary underline">
            politique de remboursement
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Contact facturation">
        <p>
          <MailLink address={CONTACTS.billing} />
        </p>
      </LegalSection>
    </LegalPage>
  );
}
