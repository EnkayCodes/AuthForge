import { DashboardLoginForm } from "./login-form";

export default function DashboardLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">AuthForge</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to the developer dashboard
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-lg">
          <DashboardLoginForm />
        </div>
      </div>
    </main>
  );
}
