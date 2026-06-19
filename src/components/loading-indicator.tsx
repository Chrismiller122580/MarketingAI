"use client";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-4 w-4 border-[1.5px]",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-amber-600 border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  );
}

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
  sublabel?: string;
  progress?: { current: number; total: number };
};

export function LoadingOverlay({
  show,
  label = "Working…",
  sublabel,
  progress,
}: LoadingOverlayProps) {
  if (!show) return null;

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {label}
          </p>
          {sublabel && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {sublabel}
            </p>
          )}
          {progress && (
            <div className="mt-4 w-full">
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {progress.current} of {progress.total}
                </span>
                {pct !== null && <span>{pct}%</span>}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type InlineLoadingProps = {
  label: string;
  className?: string;
};

export function InlineLoading({ label, className = "" }: InlineLoadingProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Spinner size="sm" />
      <span>{label}</span>
    </span>
  );
}