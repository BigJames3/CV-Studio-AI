'use client';

import { useEffect, useRef, useState } from 'react';
import type { TemplateKey } from '@/lib/templates/types';
import { SAMPLE_CV } from '@/lib/templates/sample-cv';
import { TemplateWrapper } from './TemplateWrapper';

/** A4 width in CSS pixels (210 mm at 96 dpi). */
const A4_WIDTH_PX = 794;

/** Live, scaled-down render of a template with the sample CV, sized to its container. */
export function TemplateThumbnail({ templateKey }: { templateKey: TemplateKey }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / A4_WIDTH_PX);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none relative h-full w-full overflow-hidden"
    >
      <div
        style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <TemplateWrapper templateKey={templateKey} data={SAMPLE_CV} paper />
      </div>
    </div>
  );
}
