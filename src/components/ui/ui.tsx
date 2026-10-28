import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Toast } from '../../hooks/useProgress';

export function ProgressBar({
  value,
  label,
  className = '',
  tone = 'accent',
}: {
  /** 0..100 */
  value: number;
  label: string;
  className?: string;
  tone?: 'accent' | 'good';
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${tone === 'good' ? 'bg-good' : 'bg-accent'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-mute">
        <span aria-hidden="true">{icon}</span>
        <span className="label">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-mute">{hint}</div> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-mute">{subtitle}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <span className="text-mute" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children ? <p className="max-w-md text-sm text-mute">{children}</p> : null}
      {action}
    </div>
  );
}

/** Accessible modal: focus moves in, Tab is trapped, Escape closes, focus returns to the opener. */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => !el.hasAttribute('disabled'),
      );
    // Focus the least destructive control (the first button) by default.
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="card w-full max-w-md p-6 shadow-2xl">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-3 space-y-3 text-sm text-mute">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function ToastRegion({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 right-4 z-40 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 lg:bottom-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const id = window.setTimeout(() => onDismiss(toast.id), 5000);
    return () => window.clearTimeout(id);
  }, [toast.id, onDismiss]);
  return (
    <div className="toast-in pointer-events-auto card flex items-start gap-3 p-3 shadow-lg">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.body ? <p className="text-xs text-mute">{toast.body}</p> : null}
      </div>
      <button type="button" aria-label="Dismiss notification" className="rounded p-1 text-mute hover:text-ink" onClick={() => onDismiss(toast.id)}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            o.value === value ? 'bg-accent text-accent-ink' : 'text-mute hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? 'border-accent bg-accent' : 'border-line bg-surface'}`}
    >
      <span
        className={`absolute top-0.5 rounded-full transition-all ${checked ? 'left-[22px] bg-accent-ink' : 'left-0.5 bg-mute'}`}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}
