'use client';

import type {
  DensityPreset,
  TemplateCustomization,
  TemplateDesignData,
} from '@/lib/templates/types';
import { Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function TemplateCustomizer({
  designData,
  value,
  onChange,
}: {
  designData: TemplateDesignData;
  value: TemplateCustomization;
  onChange: (patch: Partial<TemplateCustomization>) => void;
}) {
  const atsLocked = designData.features.atsSafe && designData.key === 'ats';

  return (
    <aside
      className="space-y-6 rounded-xl border border-border bg-surface-card p-4"
      aria-label="Template customization"
    >
      <div>
        <h2 className="text-sm font-semibold">Customize</h2>
        <p className="mt-1 text-xs text-[color:var(--cv-text-secondary)]">
          Live preview updates instantly. Saved on your CV when you create.
        </p>
      </div>

      {!atsLocked ? (
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
            Colors
          </legend>
          <ColorField
            label="Primary"
            value={value.primaryColor}
            onChange={(primaryColor) => onChange({ primaryColor })}
          />
          <ColorField
            label="Accent"
            value={value.accentColor}
            onChange={(accentColor) => onChange({ accentColor })}
          />
          <ColorField
            label="Background"
            value={value.backgroundColor}
            onChange={(backgroundColor) => onChange({ backgroundColor })}
          />
          <div className="flex flex-wrap gap-2">
            {designData.colorPresets.map((p) => (
              <button
                key={p.name}
                type="button"
                title={p.name}
                className="h-7 w-7 rounded-full border border-border"
                style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }}
                onClick={() => onChange({ primaryColor: p.primary, accentColor: p.accent })}
              />
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-xs text-[color:var(--cv-text-secondary)]">
          ATS template locks colors to black on white for maximum parseability.
        </p>
      )}

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
          Fonts
        </legend>
        <div>
          <Label htmlFor="headerFont">Header font</Label>
          <select
            id="headerFont"
            className="mt-1 w-full rounded-md border border-border bg-surface-card px-2 py-2 text-sm"
            value={value.headerFont}
            onChange={(e) => onChange({ headerFont: e.target.value })}
          >
            {designData.fontOptions.headers.map((f) => (
              <option key={f} value={f}>
                {f.split(',')[0]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="bodyFont">Body font</Label>
          <select
            id="bodyFont"
            className="mt-1 w-full rounded-md border border-border bg-surface-card px-2 py-2 text-sm"
            value={value.bodyFont}
            onChange={(e) => onChange({ bodyFont: e.target.value })}
          >
            {designData.fontOptions.body.map((f) => (
              <option key={f} value={f}>
                {f.split(',')[0]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
          Size
        </legend>
        <div className="mt-2 flex gap-2">
          {(['compact', 'normal', 'spacious'] as DensityPreset[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ density: d })}
              className={cn(
                'flex-1 rounded-md border px-2 py-2 text-xs font-medium capitalize',
                value.density === d
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border'
              )}
            >
              {d === 'compact' ? 'Compact' : d === 'normal' ? 'Normal' : 'Spacious'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
          Sections
        </legend>
        <Toggle
          label="Photo"
          checked={value.showPhoto}
          disabled={!designData.features.supportsPhoto || atsLocked}
          onChange={(showPhoto) => onChange({ showPhoto })}
        />
        <Toggle
          label="Summary / objectives"
          checked={value.showSummary}
          onChange={(showSummary) => onChange({ showSummary })}
        />
        <Toggle
          label="Experience"
          checked={value.showExperience}
          onChange={(showExperience) => onChange({ showExperience })}
        />
        <Toggle
          label="Education"
          checked={value.showEducation}
          onChange={(showEducation) => onChange({ showEducation })}
        />
        <Toggle
          label="Skills"
          checked={value.showSkills}
          onChange={(showSkills) => onChange({ showSkills })}
        />
        <Toggle
          label="Projects"
          checked={value.showProjects}
          onChange={(showProjects) => onChange({ showProjects })}
        />
        <Toggle
          label="Certifications"
          checked={value.showCertificates}
          onChange={(showCertificates) => onChange({ showCertificates })}
        />
        <Toggle
          label="References"
          checked={value.showReferences}
          onChange={(showReferences) => onChange({ showReferences })}
        />
      </fieldset>
    </aside>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
        aria-label={label}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn('flex items-center justify-between gap-3 text-sm', disabled && 'opacity-50')}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[color:var(--cv-color-primary)]"
      />
    </label>
  );
}
