"use client";

import { useState } from "react";

export function InviteLink({ token, email }: { token: string; email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}/auth/sign-up?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <button type="button" onClick={copy} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-[#162033] hover:bg-slate-50">{copied ? "Copied" : "Copy invite link"}</button>;
}
