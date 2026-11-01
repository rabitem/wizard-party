'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../account/ui';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * A button that asks once before an irreversible step (cancel, withdraw, void a table): the first
 * tap turns it into "Sure? Yes / No" in place, so there is no modal to lose on small screens.
 */
export function ConfirmAction({ label, confirmLabel, question, icon, variant = 'secondary', confirmVariant = 'danger', cancelLabel = 'Keep it', loading = false, disabled = false, onConfirm, className = '' }: {
  label: string;
  confirmLabel: string;
  question: string;
  icon?: ReactNode;
  variant?: Variant;
  /** Style of the "yes" button: danger for destructive steps, primary for e.g. starting. */
  confirmVariant?: Variant;
  /** The "no" button. */
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Move focus to the confirmation, so keyboard and screen reader users land on the question.
    if (asking) groupRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [asking]);

  if (!asking || loading) {
    return (
      <Button variant={variant} icon={icon} loading={loading} disabled={disabled} onClick={() => setAsking(true)} className={className}>
        {label}
      </Button>
    );
  }
  return (
    <div ref={groupRef} role="group" aria-label={question} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-amber-200/70">{question}</span>
      <Button
        variant={confirmVariant}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        {cancelLabel}
      </Button>
    </div>
  );
}
