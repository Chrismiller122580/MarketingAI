import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
};

const sizes = {
  sm: { mark: "h-8 w-8 text-sm", label: "text-base" },
  md: { mark: "h-9 w-9 text-sm", label: "text-lg" },
};

export function BrandLogo({
  href = "/",
  size = "sm",
  className = "",
  onClick,
}: BrandLogoProps) {
  const s = sizes[size];

  const content = (
    <>
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-crawl-700 to-spark-500 font-bold text-white ${s.mark}`}
        aria-hidden
      >
        C
      </div>
      <span
        className={`truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100 ${s.label}`}
      >
        crawlspark.ai
      </span>
    </>
  );

  const classes = `flex min-w-0 items-center gap-2 ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes}>
      {content}
    </div>
  );
}