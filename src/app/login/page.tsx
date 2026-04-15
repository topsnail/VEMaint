import { LoginForm } from "@/components/login-form";
import { PageContainer } from "@/components/page-container";

export default function LoginPage() {
  return (
    <PageContainer size="standard" className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <LoginForm />
    </PageContainer>
  );
}
