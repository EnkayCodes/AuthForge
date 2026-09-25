import { AuthScene } from "@/components/three/auth-scene";
import { ForgotPasswordForm } from "./forgot-password-form";

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  scope?: string;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!params.client_id) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-semibold text-red-600">Invalid request</h1>
          <p className="text-sm text-gray-600">
            Missing required parameters. This page should be accessed via an
            application&apos;s login flow.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthScene subtitle="Reset your password">
      <ForgotPasswordForm
        clientId={params.client_id}
        redirectUri={params.redirect_uri ?? ""}
        state={params.state ?? ""}
        codeChallenge={params.code_challenge ?? ""}
        scope={params.scope ?? ""}
      />
    </AuthScene>
  );
}
