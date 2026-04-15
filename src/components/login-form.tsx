"use client";

import { authBootstrapStatusAction, loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [usersExist, setUsersExist] = useState(true);
  const [bootstrapConfigured, setBootstrapConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authBootstrapStatusAction();
      if (!cancelled) {
        setUsersExist(res.usersExist);
        setBootstrapConfigured(res.bootstrapConfigured);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await loginAction({ username, password });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">登录系统</h1>
        <p className="mt-1 text-xs text-slate-500">
          {usersExist
            ? "请输入账号和密码。可使用：① Cloudflare 中为首个超级管理员配置的账号密码；② 超级管理员在「系统设置」中创建的员工账号。"
            : bootstrapConfigured
              ? "当前尚无用户：请使用在 Cloudflare 中配置的 BOOTSTRAP_ADMIN_USERNAME（默认 admin）与 BOOTSTRAP_ADMIN_PASSWORD 登录，系统将创建首个超级管理员。"
              : "当前尚无用户：请先在 Cloudflare 环境变量中配置 BOOTSTRAP_ADMIN_PASSWORD（可选 BOOTSTRAP_ADMIN_USERNAME），保存并重新部署后再登录。"}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-username">用户名</Label>
        <Input id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">密码</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      {msg ? <p className="text-xs text-rose-600">{msg}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "登录中…" : "登录"}
      </Button>
    </form>
  );
}
