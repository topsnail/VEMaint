import { Button, Card, Form, Input, Typography, message } from "antd";
import { apiFetch } from "../lib/http";
import { setToken, setUser } from "../lib/auth";

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [form] = Form.useForm<{ username: string; password: string }>();

  const submit = async () => {
    const values = await form.validateFields();
    const res = await apiFetch<{ token: string }>("/login", {
      method: "POST",
      body: JSON.stringify(values),
    });
    if (!res.ok) return message.error(res.error.message);
    setToken(res.data.token);
    const me = await apiFetch<{ userId: string; username: string; role: "admin" | "maintainer" | "reader" }>("/user/info");
    if (!me.ok) return message.error(me.error.message);
    setUser(me.data);
    message.success("登录成功");
    onLoggedIn();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card style={{ width: 360 }}>
        <Typography.Title level={4} style={{ marginBottom: 20 }}>
          车辆维保管理系统
        </Typography.Title>
        <Form form={form} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" block onClick={submit}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}

