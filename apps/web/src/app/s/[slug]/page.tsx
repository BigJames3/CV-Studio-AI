import { createPageMetadata } from '@/lib/seo';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type PublicCv = {
  id: string;
  title: string;
  content: {
    sections?: {
      identity?: { fullName?: string; title?: string; email?: string; summary?: string };
      summary?: { text?: string };
      experiences?: Array<{
        company?: string;
        role?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
      }>;
      education?: Array<{ school?: string; degree?: string; year?: string }>;
      skills?: Array<{ name?: string } | string>;
    };
  };
  templateId: string | null;
  publicUrl: string;
  updatedAt: string;
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return createPageMetadata({
    title: `CV · ${params.slug}`,
    description: 'CV public partagé via CV Studio AI',
    path: `/s/${params.slug}`,
  });
}

async function fetchPublicCv(slug: string): Promise<PublicCv | null> {
  try {
    const res = await fetch(`${API_URL}/public/cvs/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicCv;
  } catch {
    return null;
  }
}

export default async function PublicCvPage({ params }: { params: { slug: string } }) {
  const cv = await fetchPublicCv(params.slug);

  if (!cv) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">CV introuvable</h1>
        <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">
          Ce CV n’est pas disponible ou n’est plus public.
        </p>
      </main>
    );
  }

  const identity = cv.content?.sections?.identity ?? {};
  const summary = cv.content?.sections?.summary?.text ?? identity.summary ?? '';
  const experiences = cv.content?.sections?.experiences ?? [];
  const education = cv.content?.sections?.education ?? [];
  const skills = cv.content?.sections?.skills ?? [];

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-12">
      <header className="border-b border-border pb-6">
        <p className="text-sm text-[color:var(--cv-text-muted)]">CV Studio AI · partage public</p>
        <h1 className="mt-2 text-3xl font-semibold">{identity.fullName || cv.title}</h1>
        {identity.title && (
          <p className="mt-1 text-lg text-[color:var(--cv-text-secondary)]">{identity.title}</p>
        )}
        {identity.email && (
          <p className="mt-2 text-sm text-[color:var(--cv-text-muted)]">{identity.email}</p>
        )}
      </header>

      {summary && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cv-text-muted)]">
            Résumé
          </h2>
          <p className="mt-2 whitespace-pre-wrap">{summary}</p>
        </section>
      )}

      {experiences.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cv-text-muted)]">
            Expérience
          </h2>
          <ul className="mt-3 space-y-4">
            {experiences.map((exp, i) => (
              <li key={i}>
                <p className="font-medium">
                  {exp.role}
                  {exp.company ? ` · ${exp.company}` : ''}
                </p>
                {(exp.startDate || exp.endDate) && (
                  <p className="text-xs text-[color:var(--cv-text-muted)]">
                    {[exp.startDate, exp.endDate].filter(Boolean).join(' — ')}
                  </p>
                )}
                {exp.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--cv-text-secondary)]">
                    {exp.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {education.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cv-text-muted)]">
            Formation
          </h2>
          <ul className="mt-3 space-y-2">
            {education.map((ed, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{ed.degree}</span>
                {ed.school ? ` · ${ed.school}` : ''}
                {ed.year ? ` (${ed.year})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cv-text-muted)]">
            Compétences
          </h2>
          <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">
            {skills
              .map((s) => (typeof s === 'string' ? s : s.name))
              .filter(Boolean)
              .join(' · ')}
          </p>
        </section>
      )}
    </main>
  );
}
