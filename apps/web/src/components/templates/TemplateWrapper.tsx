'use client';

import type { CvContent, TemplateCustomization, TemplateKey } from '@/lib/templates/types';
import { mergeCustomization } from '@/lib/templates/types';
import { TEMPLATE_DESIGN_DATA } from '@/lib/templates/catalog';
import { ModernTemplate } from './ModernTemplate';
import { CreativeTemplate } from './CreativeTemplate';
import { ExecutiveTemplate } from './ExecutiveTemplate';
import { StartupTemplate } from './StartupTemplate';
import { ATSTemplate } from './ATSTemplate';

const RENDERERS = {
  modern: ModernTemplate,
  creative: CreativeTemplate,
  executive: ExecutiveTemplate,
  startup: StartupTemplate,
  ats: ATSTemplate,
} as const;

export function TemplateWrapper({
  templateKey,
  data,
  customization,
  className,
  paper = true,
}: {
  templateKey: TemplateKey;
  data: CvContent;
  customization?: Partial<TemplateCustomization>;
  className?: string;
  paper?: boolean;
}) {
  const design = TEMPLATE_DESIGN_DATA[templateKey];
  const merged = mergeCustomization(design.defaults, {
    ...data.customization,
    ...customization,
  });
  // ATS forces no photo / mono colors
  if (templateKey === 'ats') {
    merged.showPhoto = false;
    merged.primaryColor = '#000000';
    merged.accentColor = '#000000';
    merged.backgroundColor = '#ffffff';
    merged.textColor = '#000000';
  }

  const Renderer = RENDERERS[templateKey];

  return (
    <div
      className={className}
      data-template={templateKey}
      data-cv-preview="true"
      style={
        paper
          ? {
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '100%',
              background: merged.backgroundColor,
              boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
              overflow: 'hidden',
            }
          : undefined
      }
    >
      <Renderer data={data} customization={merged} />
    </div>
  );
}

export { ModernTemplate, CreativeTemplate, ExecutiveTemplate, StartupTemplate, ATSTemplate };
