import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    next?: string;
    message?: string;
  }>;
};

export default async function LoginAliasPage({ searchParams }: PageProps) {
  const { next, message } = await searchParams;
  const params = new URLSearchParams();

  if (next) {
    params.set("next", next);
  }

  if (message) {
    params.set("message", message);
  }

  redirect(`/auth/login${params.toString() ? `?${params.toString()}` : ""}`);
}
