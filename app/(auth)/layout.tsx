export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-surface glass-specular w-full max-w-sm rounded-(--glass-radius-lg) p-8">
        {children}
      </div>
    </main>
  );
}
