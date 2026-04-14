"use client";

import { authBootstrapStatusAction, createUserAction, loginAction } from "@/app/actions/auth";
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authBootstrapStatusAction();
      if (!cancelled) setUsersExist(res.usersExist);
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

  function onCreateFirstAdmin() {
    setMsg(null);
    startTransition(async () => {
      const created = await createUserAction({ username, password, role: "admin" });
      if (!created.ok) {
        setMsg(created.error);
        return;
      }
      const loginRes = await loginAction({ username, password });
      if (!loginRes.ok) {
        setMsg(loginRes.error);
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
          {usersExist ? "请输入管理员分配的账号和密码。" : "当前无用户，请先初始化第一个管理员账号。"}
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
      {usersExist ? (
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "登录中…" : "登录"}
        </Button>
      ) : (
        <Button type="button" disabled={pending} className="w-full" onClick={onCreateFirstAdmin}>
          {pending ? "创建中…" : "创建首个管理员并登录"}
        </Button>
      )}
    </form>
  );
}
