import { RegisterForm } from "@/components/auth/RegisterForm";
import { createCaller } from "@/lib/trpc/server";
import Link from "next/link";

export default async function RegisterPage() {
  const caller = await createCaller();
  const orgs = await caller.org.listPublic();

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-6">Create your account</h1>
      <RegisterForm orgs={orgs} />
      <p className="text-center text-slate-400 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-sky-400 hover:text-sky-300">
          Sign in
        </Link>
      </p>
    </>
  );
}
