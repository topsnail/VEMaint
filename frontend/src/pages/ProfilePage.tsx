import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer } from "../components/PageContainer";
import { useProfilePassword } from "../hooks/useProfilePassword";
import { profilePasswordSchema, type ProfilePasswordInput } from "../lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfilePage() {
  const { submitting, changePassword } = useProfilePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfilePasswordInput>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "" },
  });

  const submit = async (values: ProfilePasswordInput) => {
    const res = await changePassword(values.oldPassword, values.newPassword);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("密码修改成功");
    reset();
  };

  return (
    <PageContainer
      title="个人中心"
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: "个人中心" },
      ]}
    >
      <div className="max-w-lg">
        <form className="space-y-3" onSubmit={handleSubmit(submit)}>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">旧密码</div>
            <Input type="password" {...register("oldPassword")} />
            {errors.oldPassword?.message ? <div className="mt-1 text-xs text-red-500">{errors.oldPassword.message}</div> : null}
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">新密码</div>
            <Input type="password" {...register("newPassword")} />
            {errors.newPassword?.message ? <div className="mt-1 text-xs text-red-500">{errors.newPassword.message}</div> : null}
          </div>
          <Button type="submit" variant="primary" disabled={submitting}>
            修改密码
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}

