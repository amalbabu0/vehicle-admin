export default function RootPage() {
  // Real dashboard/login routing lands with the Authentication and RBAC
  // tasks. This confirms the scaffold (providers, Tailwind, shadcn, fonts)
  // boots end-to-end before those features are built.
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-surface glass-specular max-w-md rounded-(--glass-radius-lg) p-8 text-center">
        <h1 className="text-2xl font-semibold">Admin Portal</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Scaffold is up. Authentication and the dashboard shell land next.
        </p>
      </div>
    </main>
  );
}
