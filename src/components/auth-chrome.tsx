import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";

export function AuthChrome() {
  return (
    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-6">
      <BrandLogo
        href="/"
        size="sm"
        className="absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0"
      />
      <ThemeToggle className="relative z-10 ml-auto sm:ml-0" />
    </div>
  );
}
