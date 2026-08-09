// `dark` is applied directly on this wrapper (not toggled/read from
// anywhere) — pre-login there's no lister theme preference to read, and
// this route group has no Radix popovers/dropdowns that would need the
// class on <html> to be visible to a portal (see lister-shell.tsx's fix
// for that scenario), so scoping it here is sufficient. bg-background/
// text-foreground are set explicitly since <body> itself (in the shared
// root layout) is outside this dark-classed subtree and would otherwise
// still resolve the light theme's values.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />
        {children}
      </div>
    </main>
  );
}
