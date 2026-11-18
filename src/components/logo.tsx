import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="oklch(0.5 0.125 38)" />
      <path d="M10 7h8l5 5v13a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" fill="oklch(0.985 0.012 80)" />
      <path d="M18 7v5h5" fill="oklch(0.88 0.05 65)" />
      <path d="M12.5 17h7M12.5 20.5h5" stroke="oklch(0.5 0.125 38)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 whitespace-nowrap rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${className}`}>
      <LogoMark className="size-8 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="font-display text-xl font-semibold tracking-tight">Ajaia Docs</span>
    </Link>
  );
}
