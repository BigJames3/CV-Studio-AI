/** Lifecycle e-mails, in sending priority order (at most one per user and per run). */
export const LIFECYCLE_EMAIL_TYPES = [
  'trial_ending',
  'cv_unfinished',
  'ats_tip',
  'reactivation',
] as const;
export type LifecycleEmailType = (typeof LIFECYCLE_EMAIL_TYPES)[number];

export type LifecycleEmailContext = {
  firstName: string;
  appUrl: string;
  unsubscribeUrl: string;
  /** cv_unfinished: whether the user already started a CV. */
  hasCv?: boolean;
  /** trial_ending */
  planName?: string;
  trialEnd?: Date;
};

export type RenderedEmail = { subject: string; html: string; text: string };

function link(appUrl: string, path: string, campaign: LifecycleEmailType): string {
  const url = new URL(path, appUrl);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'lifecycle');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(params: {
  greeting: string;
  paragraphs: string[];
  cta: { label: string; url: string };
  unsubscribeUrl: string;
  billingNotice?: boolean;
}): { html: string; text: string } {
  const footer = params.billingNotice
    ? 'Cet e-mail concerne votre abonnement : il est envoyé même si vous avez désactivé les conseils.'
    : `Vous recevez ces conseils car vous avez un compte CV Studio AI. Se désinscrire : ${params.unsubscribeUrl}`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-size:18px;font-weight:bold;color:#1A6EF4;padding-bottom:16px">CV Studio AI</td></tr>
<tr><td style="font-size:16px;line-height:24px">
<p style="margin:0 0 16px">${escapeHtml(params.greeting)}</p>
${params.paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join('\n')}
<p style="margin:24px 0"><a href="${escapeHtml(params.cta.url)}" style="background:#1A6EF4;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">${escapeHtml(params.cta.label)}</a></p>
</td></tr>
<tr><td style="font-size:12px;line-height:18px;color:#64748b;padding-top:16px;border-top:1px solid #e2e8f0">${
    params.billingNotice
      ? escapeHtml(footer)
      : `Vous recevez ces conseils car vous avez un compte CV Studio AI. <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#64748b">Se désinscrire</a>`
  }</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    params.greeting,
    '',
    ...params.paragraphs.flatMap((p) => [p, '']),
    `${params.cta.label} : ${params.cta.url}`,
    '',
    '—',
    footer,
  ].join('\n');
  return { html, text };
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);

export function renderLifecycleEmail(
  type: LifecycleEmailType,
  ctx: LifecycleEmailContext
): RenderedEmail {
  const greeting = `Bonjour ${ctx.firstName},`;
  switch (type) {
    case 'cv_unfinished': {
      const subject = ctx.hasCv
        ? 'Votre CV est presque prêt : terminez-le en 5 minutes'
        : 'Créez votre CV en 2 minutes';
      const paragraphs = ctx.hasCv
        ? [
            'Vous avez commencé votre CV sur CV Studio AI, mais il lui manque encore l’essentiel : un résumé et vos expériences.',
            'Un CV complet, avec des réalisations chiffrées, a beaucoup plus de chances d’être retenu par les recruteurs.',
          ]
        : [
            'Votre compte CV Studio AI est prêt, mais vous n’avez pas encore créé de CV.',
            'Choisissez votre métier et partez d’un exemple déjà rédigé : il ne reste qu’à l’adapter à votre parcours.',
          ];
      return {
        subject,
        ...layout({
          greeting,
          paragraphs,
          cta: ctx.hasCv
            ? { label: 'Terminer mon CV', url: link(ctx.appUrl, '/dashboard', type) }
            : { label: 'Créer mon CV', url: link(ctx.appUrl, '/bienvenue', type) },
          unsubscribeUrl: ctx.unsubscribeUrl,
        }),
      };
    }
    case 'ats_tip':
      return {
        subject: 'Votre CV passe-t-il les filtres des recruteurs ?',
        ...layout({
          greeting,
          paragraphs: [
            'Beaucoup d’entreprises trient les candidatures avec un logiciel (ATS) avant qu’un recruteur ne les lise.',
            'Le score ATS de CV Studio AI vous dit en quelques secondes si votre CV est lisible par ces logiciels, et quels mots-clés ajouter pour l’offre visée.',
          ],
          cta: { label: 'Tester mon CV', url: link(ctx.appUrl, '/dashboard', type) },
          unsubscribeUrl: ctx.unsubscribeUrl,
        }),
      };
    case 'trial_ending': {
      const date = ctx.trialEnd ? formatDate(ctx.trialEnd) : 'bientôt';
      return {
        subject: `Votre essai ${ctx.planName ?? 'Premium'} se termine le ${date}`,
        ...layout({
          greeting,
          paragraphs: [
            `Votre période d’essai ${ctx.planName ?? 'Premium'} se termine le ${date}. Votre abonnement continuera ensuite automatiquement, au tarif affiché dans votre espace facturation.`,
            'Si vous ne souhaitez pas continuer, vous pouvez annuler en un clic depuis votre espace facturation avant cette date : vous ne serez pas débité.',
          ],
          cta: { label: 'Gérer mon abonnement', url: link(ctx.appUrl, '/account/billing', type) },
          unsubscribeUrl: ctx.unsubscribeUrl,
          billingNotice: true,
        }),
      };
    }
    case 'reactivation':
      return {
        subject: 'Vos CV vous attendent sur CV Studio AI',
        ...layout({
          greeting,
          paragraphs: [
            'Cela fait un moment que nous ne vous avons pas vu. Vos CV sont toujours là, prêts à être mis à jour pour votre prochaine candidature.',
            'Adaptez-les à une offre en quelques minutes : optimisation par l’IA, score ATS et nouveaux modèles.',
          ],
          cta: { label: 'Mettre à jour mon CV', url: link(ctx.appUrl, '/dashboard', type) },
          unsubscribeUrl: ctx.unsubscribeUrl,
        }),
      };
  }
}
