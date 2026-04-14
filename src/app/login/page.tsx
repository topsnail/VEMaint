import { LoginForm } from "@/components/login-form";

export const runtime = "edge";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center justify-center">
      <LoginForm />
    </div>
  );
}
