"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const encodeMessage = (value: string) => encodeURIComponent(value);

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/orcamentos");

  if (!email || !password) {
    redirect(`/auth/login?message=${encodeMessage("Informe email e senha.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?message=${encodeMessage(toErrorMessage(error, "Falha ao entrar."))}`);
  }

  redirect(next.startsWith("/") ? next : "/orcamentos");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/auth/sign-up?message=${encodeMessage("Informe email e senha.")}`);
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/orcamentos`,
    },
  });

  if (error) {
    redirect(`/auth/sign-up?message=${encodeMessage(toErrorMessage(error, "Falha ao criar conta."))}`);
  }

  redirect(
    `/auth/login?message=${encodeMessage("Conta criada. Verifique seu email para confirmar o cadastro.")}`,
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
