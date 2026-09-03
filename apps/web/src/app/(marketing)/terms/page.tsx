import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Conditions d’utilisation',
  description: 'Conditions d’utilisation de CV Studio AI.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-content px-4 py-16" data-testid="legal-terms-page">
      <h1 className="text-4xl font-semibold">Conditions d’utilisation</h1>
      <p className="mt-2 text-sm text-content-secondary">Dernière mise à jour : 16 août 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-content-secondary">
        <section>
          <h2 className="text-xl font-semibold text-content-primary">1. Acceptation</h2>
          <p className="mt-2">
            En créant un compte ou en utilisant CV Studio AI, vous acceptez ces conditions et la{' '}
            <a className="text-primary underline" href="/privacy">
              politique de confidentialité
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">2. Le service</h2>
          <p className="mt-2">
            CV Studio AI fournit des outils d’édition, d’export PDF et d’assistance IA pour des
            curriculums vitae. Les suggestions IA sont indicatives ; vous restez responsable du
            contenu publié ou envoyé à un recruteur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">3. Compte</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Fournir des informations exactes et protéger vos identifiants</li>
            <li>Ne pas tenter d’accéder aux données d’autrui</li>
            <li>Ne pas surcharger l’API, contourner les quotas ou abuser de l’export PDF</li>
            <li>Ne pas y déposer de contenus illicites ou de données de santé intentionnelles</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">
            4. Propriété intellectuelle
          </h2>
          <p className="mt-2">
            Vous conservez les droits sur le contenu de vos CV. CV Studio AI conserve les droits sur
            la plateforme, les templates et les modèles d’IA.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">5. Paiements</h2>
          <p className="mt-2">
            Les abonnements se renouvellent jusqu’à annulation dans les paramètres. La suppression
            du compte annule immédiatement la facturation Stripe. Pas de remboursement au prorata
            sauf obligation légale.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">
            6. Limitation de responsabilité
          </h2>
          <p className="mt-2">
            Le service est fourni « en l’état ». CV Studio AI n’est pas responsable des dommages
            indirects, perte d’opportunité d’emploi ou contenu généré par l’IA.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">7. Résiliation</h2>
          <p className="mt-2">
            Vous pouvez supprimer votre compte à tout moment. Nous pouvons suspendre un compte en
            cas de violation de ces conditions ou de la loi.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-content-primary">8. Contact</h2>
          <p className="mt-2">
            <a className="text-primary underline" href="mailto:legal@cvstudio.ai">
              legal@cvstudio.ai
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
