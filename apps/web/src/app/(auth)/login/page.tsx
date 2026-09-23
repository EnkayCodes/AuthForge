import { LoginForm } from "./login-form";

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  scope?: string;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!params.client_id || !params.redirect_uri || !params.state || !params.code_challenge) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-semibold text-red-600">Invalid Request</h1>
          <p className="text-sm text-gray-600">
            Missing required authorization parameters. This page should be
            accessed via an application&apos;s login flow.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">AuthForge</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-lg">
          <LoginForm
            clientId={params.client_id}
            redirectUri={params.redirect_uri}
            state={params.state}
            codeChallenge={params.code_challenge}
            scope={params.scope ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
