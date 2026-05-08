import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-6">Sign in to DevPortal</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-slate-400 text-sm mt-6">
        No account?{" "}
        <Link href="/register" className="text-sky-400 hover:text-sky-300">
          Create one
        </Link>
      </p>
    </>
  );
}
