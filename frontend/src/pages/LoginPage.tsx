import { Eye, EyeOff, Lock, User } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import styles from "./LoginPage.module.css";
import { apiFetch } from "../lib/http";
import { clearPersistedAuthSession, clearToken, persistAuthSession, setCsrfToken, setToken, setUser } from "../lib/auth";
import { AnimatedCharacters } from "../components/AnimatedCharacters";
import logoPng from "../../favicon.png";
import { loginSchema, type LoginInput } from "../lib/schemas";

const LAST_USERNAME_KEY = "vemaint:last_username";
const REMEMBER_ME_KEY = "vemaint:remember_me";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const initialUsername = (() => {
    try {
      return String(window.localStorage.getItem(LAST_USERNAME_KEY) ?? "");
    } catch {
      return "";
    }
  })();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: initialUsername, password: "" },
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return window.localStorage.getItem(REMEMBER_ME_KEY) === "1";
    } catch {
      return false;
    }
  });

  const usernameValue = watch("username") ?? "";
  const passwordValue = watch("password") ?? "";

  const handleLogin = async (values: LoginInput) => {
    setLoading(true);
    setLoginError("");

    try {
      try {
        window.localStorage.setItem(LAST_USERNAME_KEY, String(values.username ?? "").trim());
      } catch {
        // ignore
      }

      const res = await apiFetch<{ token: string; csrfToken: string }>("/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        setLoginError(res.error.message);
        return;
      }

      setToken(res.data.token);
      setCsrfToken(res.data.csrfToken);

      const me = await apiFetch<{
        userId: string;
        username: string;
        role: "admin" | "maintainer" | "reader";
      }>("/user/info");

      if (!me.ok) {
        clearToken();
        setLoginError(me.error.message);
        return;
      }

      setUser(me.data);
      try {
        window.localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "1" : "0");
      } catch {
        // ignore
      }
      if (rememberMe) {
        persistAuthSession();
      } else {
        clearPersistedAuthSession();
      }
      toast.success("登录成功");
      onLoggedIn();
    } catch {
      clearToken();
      setLoginError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const isTyping = isUsernameFocused && usernameValue.length > 0;

  return (
    <div className={styles.container}>
      {/* 左侧：动画角色 + 背景装饰 */}
      <div className={styles.leftPanel}>
        <div className={styles.leftTop}>
          <div className={styles.brandMark}>
            <img src={logoPng} alt="VEMaint" className={styles.brandIconImg} />
          </div>
          <span className={styles.brandName}>VEMaint</span>
        </div>

        <div className={styles.charactersArea}>
          <AnimatedCharacters
            isTyping={isTyping}
            showPassword={showPassword}
            passwordFocused={isPasswordFocused}
            passwordLength={passwordValue.length}
          />
        </div>

        <div className={styles.decorBlur1} />
        <div className={styles.decorBlur2} />
        <div className={styles.decorGrid} />
      </div>

      {/* 右侧：登录表单 */}
      <div className={styles.rightPanel}>
        <div className={styles.mobileLogo}>
          <div className={styles.mobileLogoIcon}>
            <img src={logoPng} alt="VEMaint" className={styles.mobileLogoIconImg} />
          </div>
          <span>VEMaint</span>
        </div>
        <div className={styles.formCard}>
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>车辆/设备维保管理系统</h1>
            </div>

            <form
              onSubmit={handleSubmit(handleLogin)}
              autoComplete="off"
              className={styles.form}
            >
              <div className={styles.fieldLabel}>账号</div>
              <div className="relative">
                <User className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", styles.prefixIcon)} />
                <Input
                  {...register("username")}
                  autoFocus
                  className="h-11 pl-10"
                  placeholder="输入您的账号"
                  onFocus={() => setIsUsernameFocused(true)}
                  onBlur={() => setIsUsernameFocused(false)}
                />
              </div>
              {errors.username?.message ? <div className={styles.errorBox}>{errors.username.message}</div> : null}

              <div className={styles.fieldLabel}>密码</div>
              <div className="relative">
                <Lock className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", styles.prefixIcon)} />
                <Input
                  {...register("password")}
                  className="h-11 pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="输入您的密码（至少6位）"
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <button
                  type="button"
                  className={cn("absolute right-3 top-1/2 -translate-y-1/2", styles.eyeToggle)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {errors.password?.message ? <div className={styles.errorBox}>{errors.password.message}</div> : null}

              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-[6px] border-slate-300 text-blue-600"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                记住登录
              </label>

              {loginError ? <div className={styles.errorBox}>{loginError}</div> : null}

              <div className="mt-3">
                <Button type="submit" disabled={loading} fullWidth variant="primary" size="lg" className={styles.submitBtn}>
                  {loading ? "登录中..." : "登录"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

