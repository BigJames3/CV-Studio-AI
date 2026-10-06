'use client';

import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  /** id of a <datalist> with suggestions; the field stays free text. */
  list?: string;
  hint?: string;
};

export function FormField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  required,
  list,
  hint,
}: FieldProps) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        list={list}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'border-error' : undefined}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-content-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        className="w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SectionCard({
  title,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children,
}: {
  title: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex items-center gap-1">
          {onMoveUp || onMoveDown ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Monter"
                disabled={!canMoveUp}
                onClick={onMoveUp}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Descendre"
                disabled={!canMoveDown}
                onClick={onMoveDown}
              >
                ↓
              </Button>
            </>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            Supprimer
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function AddItemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onClick}>
      {label}
    </Button>
  );
}

/** Suggestions for a free-text field (contract types, CECRL levels…). */
export function Suggestions({ id, values }: { id: string; values: readonly string[] }) {
  return (
    <datalist id={id}>
      {values.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
