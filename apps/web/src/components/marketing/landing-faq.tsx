'use client';

import { useState } from 'react';

type FaqItem = { q: string; a: string };

/** The only interactive part of the landing page: kept as a small client island. */
export function LandingFaq({ items }: { items: FaqItem[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mt-10 divide-y divide-[#D5E0DC]">
      {items.map((item, i) => {
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
  );
}
