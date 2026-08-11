import { cn } from '../lib/utils';

/** Paper frame for live CV preview — stays light for print fidelity. */
export function CvPreviewFrame({
  children,
  className,
  scale = 1,
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
}) {
  return (
    <div className={cn('overflow-auto bg-muted/50 p-4 md:p-8', className)}>
      <div
        className="mx-auto origin-top bg-white text-neutral-900 shadow-lg"
        style={{
          width: 794,
          minHeight: 1123,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
