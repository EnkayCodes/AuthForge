import { AuthScene } from "@/components/three/auth-scene";
import { DashboardLoginForm } from "./login-form";

export default function DashboardLoginPage() {
  return (
    <AuthScene subtitle="Sign in to the developer dashboard">
      <DashboardLoginForm />
    </AuthScene>
  );
}
