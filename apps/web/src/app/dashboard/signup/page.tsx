import { AuthScene } from "@/components/three/auth-scene";
import { DashboardSignupForm } from "./signup-form";

export default function DashboardSignupPage() {
  return (
    <AuthScene subtitle="Create your developer account">
      <DashboardSignupForm />
    </AuthScene>
  );
}
