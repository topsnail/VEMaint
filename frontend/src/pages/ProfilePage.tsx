import { App, Button, Form, Input } from "antd";
import { PageContainer } from "../components/PageContainer";
import { useProfilePassword } from "../hooks/useProfilePassword";

export function ProfilePage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ oldPassword: string; newPassword: string }>();
  const { submitting, changePassword } = useProfilePassword();

  const submit = async () => {
    const values = await form.validateFields();
    const res = await changePassword(values.oldPassword, values.newPassword);
    if (!res.ok) return message.error(res.error.message);
    message.success("密码修改成功");
    form.resetFields();
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
      <Form form={form} layout="vertical">
        <Form.Item label="旧密码" name="oldPassword" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item label="新密码" name="newPassword" rules={[{ required: true }, { min: 6 }]}>
          <Input.Password />
        </Form.Item>
        <Button type="primary" loading={submitting} onClick={() => void submit()}>
          修改密码
        </Button>
      </Form>
    </div>
    </PageContainer>
  );
}

