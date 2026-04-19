import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, message } from "antd";
import { useState } from "react";

import styles from "./LoginPage.module.css";
import { apiFetch } from "../lib/http";
import { clearToken, setToken, setUser, setCsrfToken } from "../lib/auth";
import { AnimatedCharacters } from "../components/AnimatedCharacters";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [form] = Form.useForm<{ username: string; password: string }>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [usernameValue, setUsernameValue] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch<{ token: string; csrfToken: string }>("/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        setError(res.error.message);
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
        setError(me.error.message);
        return;
      }

      setUser(me.data);
      message.success("登录成功");
      onLoggedIn();
    } catch {
      clearToken();
      setError("登录失败，请重试");
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
            <img src="/favicon.png" alt="VEMaint" className={styles.brandIconImg} />
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
        <div className={styles.formCard}>
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>车辆/设备维保管理系统</h1>
            </div>

            <Form
              form={form}
              name="login"
              onFinish={handleLogin}
              autoComplete="off"
              size="large"
              className={styles.form}
            >
              <div className={styles.fieldLabel}>账号</div>
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: "请输入账号" },
                  { min: 3, message: "账号长度不能少于3个字符" },
                ]}
              >
                <Input
                  prefix={<UserOutlined className={styles.prefixIcon} />}
                  placeholder="输入您的账号"
                  onFocus={() => setIsUsernameFocused(true)}
                  onBlur={() => setIsUsernameFocused(false)}
                  onChange={(e) => setUsernameValue(e.target.value)}
                />
              </Form.Item>

              <div className={styles.fieldLabel}>密码</div>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "请输入密码" },
                  { min: 6, message: "密码长度不能少于6个字符" },
                ]}
              >
                <Input
                  prefix={<LockOutlined className={styles.prefixIcon} />}
                  type={showPassword ? "text" : "password"}
                  placeholder="输入您的密码（至少6位）"
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  suffix={
                    <span
                      className={styles.eyeToggle}
                      onMouseDown={(e) => {
                        // 防止点击眼睛按钮时触发输入失焦，从而影响动画
                        e.preventDefault();
                      }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    </span>
                  }
                />
              </Form.Item>

              {error ? <div className={styles.errorBox}>{error}</div> : null}

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className={styles.submitBtn}
                >
                  {loading ? "登录中..." : "登录"}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}

