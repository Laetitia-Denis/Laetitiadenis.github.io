"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(searchParams.get("from") || "/");
    } else {
      setError("Mot de passe incorrect.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Accès test — Praticiens</h1>
      <p>Entre le mot de passe qui t&apos;a été communiqué.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        autoFocus
      />
      <button type="submit">Entrer</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="login">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
