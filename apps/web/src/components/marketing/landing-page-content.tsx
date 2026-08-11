'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Éditeur dual-pane',
    body: 'Formulaire à gauche, aperçu live à droite. Autosave toutes les 5 secondes.',
  },
  {
    title: '5 templates pro',
    body: 'Modern, Creative, Executive, Startup et ATS — personnalisables couleurs et polices.',
  },
  {
    title: 'Export PDF fidèle',
    body: 'Le PDF colle au preview. Partage public et QR code inclus.',
  },
  {
    title: 'Sécurité compte',
    body: 'JWT rotatif, 2FA TOTP, OAuth Google & LinkedIn, sessions révocables.',
  },
];

const testimonials = [
  {
    quote: 'Mon CV est passé les ATS en une semaine. L’aperçu live m’a évité trois aller-retours PDF.',
    name: 'Camille R.',
    role: 'Product Designer',
  },
  {
    quote: 'On a migrés l’équipe careers dessus. Templates ATS + export sans watermark Free.',
    name: 'Jonas M.',
    role: 'Talent Lead',
  },
  {
    quote: 'La 2FA et les sessions, c’est rare sur un builder CV. Confiance immédiate.',
    name: 'Amina K.',
    role: 'Ingénieure data',
  },
];

const faqs = [
  {
    q: 'Le plan Free est-il vraiment utilisable ?',
    a: 'Oui : 1 CV, 5 templates, export PDF sans watermark. L’IA est sur Pro. Export DOCX arrive bientôt.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Mots de passe bcrypt (12+), tokens HttpOnly, 2FA TOTP optionnelle, rate limiting actif.',
  },
  {
    q: 'Puis-je partager mon CV sans compte recruteur ?',
    a: 'Oui via lien public + QR. Vous pouvez désactiver le lien à tout moment.',
  },
  {
    q: 'Annulation d’abonnement ?',
    a: 'Self-serve depuis Billing. Accès Pro jusqu’à la fin de période.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function LandingPageContent() {
  const reduce = useReducedMotion();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden bg-[#0B1F2A] text-[#F4F7F6]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(13,148,136,0.35), transparent 55%), linear-gradient(160deg, #0B1F2A 0%, #123040 45%, #0A4F4A 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-content flex-col justify-end px-4 pb-16 pt-28 md:justify-center md:pb-24">
          <motion.p
            className="font-[family-name:var(--font-landing-display)] text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            CV Studio AI
          </motion.p>
          <motion.h1
            className="mt-6 max-w-2xl text-2xl font-medium leading-snug text-[#D7E8E4] md:text-3xl"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            Des CV qui passent les filtres.
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl text-base text-[#A8C5BE] md:text-lg"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.22 }}
          >
            Créez un CV ATS-ready, adapté à chaque offre, en 15 minutes — avec aperçu live.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/register">
              <Button size="lg" className="bg-[#F4F7F6] text-[#0B1F2A] hover:bg-white">
                Créer mon CV gratuitement
              </Button>
            </Link>
            <Link href="/templates">
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/25 text-[#F4F7F6] hover:bg-white/10"
              >
                Voir les modèles
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-[#0B1F2A] via-transparent to-transparent md:h-[42vh]"
          aria-hidden
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </section>

      <section className="bg-[#F4F7F6] py-20 md:py-28">
        <div className="mx-auto max-w-content px-4">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl text-[#0B1F2A] md:text-4xl">
            Pourquoi CV Studio AI
          </h2>
          <p className="mt-3 max-w-2xl text-[#4A5F5A]">
            Un outil pensé pour l’activation : éditeur fiable, templates ATS, export et compte
            sécurisé — sans clutter marketing.
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial={reduce ? false : 'hidden'}
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <h3 className="text-xl font-semibold text-[#0B1F2A]">{f.title}</h3>
                <p className="mt-2 text-[#4A5F5A]">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#D5E0DC] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-content px-4">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl text-[#0B1F2A] md:text-4xl">
            Tarifs clairs
          </h2>
          <p className="mt-3 text-[#4A5F5A]">Free · Pro 9,99$/mois · Business 29,99$/mois</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/pricing">
              <Button size="lg">Voir le détail</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#F4F7F6] py-20 md:py-28">
        <div className="mx-auto max-w-content px-4">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl text-[#0B1F2A] md:text-4xl">
            Ils l’utilisent déjà
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.blockquote
                key={t.name}
                className="border-l-2 border-[#0D9488] pl-5"
                initial={reduce ? false : { opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <p className="text-[#0B1F2A]">“{t.quote}”</p>
                <footer className="mt-4 text-sm text-[#4A5F5A]">
                  {t.name} — {t.role}
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-content px-4">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl text-[#0B1F2A] md:text-4xl">
            FAQ
          </h2>
          <div className="mt-10 divide-y divide-[#D5E0DC]">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 text-left text-lg font-medium text-[#0B1F2A]"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    {item.q}
                    <span aria-hidden className="text-[#0D9488]">
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open && <p className="mt-3 max-w-2xl text-[#4A5F5A]">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0B1F2A] py-20 text-[#F4F7F6] md:py-24">
        <div className="mx-auto max-w-content px-4 text-center">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl md:text-4xl">
            Passez les filtres dès aujourd’hui
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[#A8C5BE]">
            Créez votre premier CV en moins de 15 minutes. Aucune carte bancaire pour Free.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg" className="bg-[#F4F7F6] text-[#0B1F2A] hover:bg-white">
              Créer mon CV gratuitement
            </Button>
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'CV Studio AI',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            description:
              'Builder de CV ATS-ready avec aperçu live, templates pro et export PDF.',
          }),
        }}
      />
    </>
  );
}
