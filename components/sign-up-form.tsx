"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 bg-white shadow-2xl shadow-slate-950/20 lg:border lg:border-slate-200 lg:shadow-xl">
        <CardHeader className="space-y-2 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c7511f]">Start free</p>
          <CardTitle className="text-3xl font-black tracking-tight text-[#162033]">Create your workspace</CardTitle>
          <CardDescription className="text-slate-600">
            Start with your account. We&apos;ll guide you through company setup next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="sign-up-email">Work email</Label>
                <Input
                  id="sign-up-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="sign-up-password">Password</Label>
                </div>
                <Input
                  id="sign-up-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Confirm password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <p className="-mt-3 text-xs text-slate-500">Use at least 8 characters.</p>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <Button type="submit" className="h-11 w-full bg-[#f59e0b] font-bold text-[#162033] shadow-sm hover:bg-[#fdba2d]" disabled={isLoading}>
                {isLoading ? "Creating your workspace..." : "Create workspace"}
              </Button>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              By continuing, you agree to use FulfillOS for legitimate warehouse operations.
            </p>
            <div className="mt-5 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-bold text-[#067d62] underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
