import { AuthScene } from "@/components/three/auth-scene";
import { ResetPasswordForm } from "./reset-password-form";

interface SearchParams {
  token?: string;
  client_id?: string;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!params.token || !params.client_id) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-semibold text-red-600">Invalid link</h1>
          <p className="text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthScene subtitle="Set a new password">
      <ResetPasswordForm
        token={params.token}
        clientId={params.client_id}
      />
    </AuthScene>
  );
}
