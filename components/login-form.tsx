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
import { GoogleIcon } from "@/components/google-icon";

export function LoginForm({
  className,
  initialError,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    setIsGoogleLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 bg-white shadow-2xl shadow-slate-950/20 lg:border lg:border-slate-200 lg:shadow-xl">
        <CardHeader className="space-y-2 pb-5">
          <CardTitle className="text-3xl font-black tracking-tight text-[#162033]">Welcome back</CardTitle>
          <CardDescription className="text-slate-600">
            Sign in to continue to your operations workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-50"
            disabled={isLoading || isGoogleLoading}
            onClick={handleGoogleLogin}
          >
            <GoogleIcon />
            {isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or continue with email
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
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
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm font-medium text-[#067d62] underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="h-11 w-full bg-[#f59e0b] font-bold text-[#162033] shadow-sm hover:bg-[#fdba2d]"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="font-bold text-[#067d62] underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
