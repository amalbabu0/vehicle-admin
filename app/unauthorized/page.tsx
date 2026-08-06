import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-surface glass-specular w-full max-w-sm rounded-(--glass-radius-lg) p-8 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Your account doesn&rsquo;t have permission to view this page.
        </p>
        <Link href="/login" className="mt-6 block">
          <Button variant="outline" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    </main>
  );
}
