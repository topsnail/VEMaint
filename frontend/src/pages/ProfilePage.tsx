import { Button, Form, Input, message } from "antd";
import { apiFetch } from "../lib/http";

export function ProfilePage() {
  const [form] = Form.useForm<{ oldPassword: string; newPassword: string }>();

  const submit = async () => {
    const values = await form.validateFields();
    const res = await apiFetch<{ ok: true }>("/profile/password", {
      method: "PUT",
      body: JSON.stringify(values),
    });
    if (!res.ok) return message.error(res.error.message);
    message.success("密码修改成功");
    form.resetFields();
  };

  return (
    <div className="max-w-lg">
      <Form form={form} layout="vertical">
        <Form.Item label="旧密码" name="oldPassword" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item label="新密码" name="newPassword" rules={[{ required: true }, { min: 6 }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" onClick={submit}>
          修改密码
        </Button>
      </Form>
    </div>
  );
}

