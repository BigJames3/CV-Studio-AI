import { createPageMetadata } from '@/lib/seo';
import { CONTACTS, HOSTING, OPERATOR, missing } from '@/lib/legal';
import { LegalList, LegalPage, LegalSection, MailLink } from '@/components/legal/legal-page';

export const metadata = createPageMetadata({
  title: 'Mentions légales',
  description: 'Éditeur, hébergeur et contact de CV Studio AI.',
  path: '/legal-notice',
});

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales" testId="legal-notice-page">
      <LegalSection title="Éditeur">
        <LegalList>
          <li>{OPERATOR.name ?? missing('raison sociale')}</li>
          <li>{OPERATOR.legalForm ?? missing('forme juridique et capital')}</li>
          <li>{OPERATOR.address ?? missing('adresse du siège')}</li>
          <li>{OPERATOR.registration ?? missing('numéro d’immatriculation')}</li>
          <li>{OPERATOR.vatNumber ?? missing('numéro de TVA, le cas échéant')}</li>
          <li>
            Directeur de la publication :{' '}
            {OPERATOR.publicationDirector ?? missing('directeur de la publication')}
          </li>
          <li>
            Contact : <MailLink address={CONTACTS.legal} />
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Hébergeur">
        <LegalList>
          <li>{HOSTING.provider}</li>
          <li>{HOSTING.address}</li>
          <li>Données hébergées à {HOSTING.location}</li>
        </LegalList>
      </LegalSection>
    </LegalPage>
  );
}
