import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1F2A]/80 text-[#F4F7F6] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight"
        >
          CV Studio AI
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Navigation principale">
          <Link href="/templates" className="text-[#A8C5BE] hover:text-white">
            Templates
          </Link>
          <Link href="/pricing" className="text-[#A8C5BE] hover:text-white">
            Pricing
          </Link>
          <a href="/#faq" className="text-[#A8C5BE] hover:text-white">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-3 text-sm font-medium text-[#A8C5BE] hover:text-white">
            Se connecter
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-[#F4F7F6] text-[#0B1F2A] hover:bg-white">
              Créer mon CV
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#1A3340] bg-[#0B1F2A] text-[#A8C5BE]">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-10 text-sm md:flex-row md:justify-between">
        <p>© {new Date().getFullYear()} CV Studio AI</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/templates" className="hover:text-white">
            Templates
          </Link>
          <a href="mailto:support@cvstudio.ai" className="hover:text-white">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
