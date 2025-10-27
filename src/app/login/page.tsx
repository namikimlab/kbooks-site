"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  // local state for the email input and status message
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | string>(null);

  // get a Supabase client we can use in a Client Component
  const supabase = createClientComponentClient();

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();

    setStatus("Sending link...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error);
      setStatus("Error sending link. Please try again.");
    } else {
      setStatus("Check your email for a sign-in link.");
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>

      <form onSubmit={handleSendLink} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-black px-3 py-2 text-white text-sm font-medium"
        >
          Send magic link
        </button>
      </form>

      {status && (
        <p className="mt-4 text-sm text-muted-foreground">{status}</p>
      )}

      <p className="mt-8 text-xs text-muted-foreground leading-relaxed">
        We’ll send you a one-time sign-in link. No password needed.
      </p>
    </div>
  );
}
