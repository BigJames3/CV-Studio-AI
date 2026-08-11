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
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'border-error' : undefined}
      />
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
