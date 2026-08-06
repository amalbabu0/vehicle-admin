import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Verify your email</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        We sent a verification link to your inbox. Click it to activate your
        account, then sign in below.
      </p>
      <Link href="/login" className="mt-6 block">
        <Button variant="outline" className="w-full">
          Back to sign in
        </Button>
      </Link>
    </>
  );
}
