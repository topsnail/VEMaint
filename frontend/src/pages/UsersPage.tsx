import { DeleteOutlined, KeyOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Modal, Popconfirm, Select, Skeleton, Space, Table, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { PageContainer } from "../components/PageContainer";
import { useUsersAdmin } from "../hooks/useUsersAdmin";
import { listTableScroll, listTableSticky } from "../lib/tableConfig";

type Model = { username: string; password: string; role: "admin" | "maintainer" | "reader" };
type RoleTemplate = "admin" | "maintainer" | "reader";

export function UsersPage() {
  const { message } = App.useApp();
  const { rows, loading, load, createUser, changeRole, removeUser, setDisabled, resetPassword } = useUsersAdmin();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Model>();
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplate>("reader");
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState<string | null>(null);
  const [pwdForm] = Form.useForm<{ password: string }>();

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const v = await form.validateFields();
    const res = await createUser(v);
    if (!res.ok) return message.error(res.error.message);
    message.success("创建成功");
    setOpen(false);
    form.resetFields();
    setRoleTemplate("reader");
    await load();
  };

  const onChangeRole = async (id: string, role: Model["role"]) => {
    const res = await changeRole(id, role);
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const remove = async (id: string) => {
    const res = await removeUser(id);
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const onSetDisabled = async (id: string, disabled: boolean) => {
    const res = await setDisabled(id, disabled);
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const openResetPassword = (id: string) => {
    setPwdUserId(id);
    pwdForm.resetFields();
    setPwdModalOpen(true);
  };

  const submitResetPassword = async () => {
    if (!pwdUserId) return;
    const v = await pwdForm.validateFields();
    const res = await resetPassword(pwdUserId, v.password);
    if (!res.ok) return message.error(res.error.message);
    message.success("密码已更新");
    setPwdModalOpen(false);
    setPwdUserId(null);
  };

  return (
    <PageContainer
      title="用户管理"
      breadcrumb={[
        { title: "首页", path: "/" },
        { title: "用户管理" },
      ]}
      extra={
        <Button type="primary" className="ve-primary-btn" onClick={() => setOpen(true)}>
          新增用户
        </Button>
      }
    >
      <div className="ve-users-page space-y-4">
        {loading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : (
          <Table
            className="ve-users-table ve-table"
            size="small"
            tableLayout="auto"
            rowKey="id"
            dataSource={rows}
            scroll={listTableScroll}
            sticky={listTableSticky}
            columns={[
              { title: "用户名", dataIndex: "username" },
              {
                title: "角色",
                render: (_, r) => (
                  <Select
                    value={r.role}
                    className="ve-role-select"
                    style={{ width: 140 }}
                    onChange={(v) => onChangeRole(r.id, v)}
                    options={[
                      { value: "admin", label: "管理员" },
                      { value: "maintainer", label: "维保员" },
                      { value: "reader", label: "只读用户" },
                    ]}
                  />
                ),
              },
              { title: "创建时间", dataIndex: "created_at" },
              {
                title: "状态",
                render: (_, r) =>
                  r.disabled ? (
                    <Popconfirm title="确认启用该用户？" onConfirm={() => onSetDisabled(r.id, false)}>
                      <Button size="small" className="ve-enable-btn">
                        启用
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Popconfirm title="确认禁用该用户？禁用后将无法登录。" onConfirm={() => onSetDisabled(r.id, true)}>
                      <Button size="small" danger className="ve-disable-btn">
                        禁用
                      </Button>
                    </Popconfirm>
                  ),
              },
              {
                title: "操作",
                render: (_, r) => (
                  <Space size={6}>
                    <Tooltip title="重置密码">
                      <Button type="text" size="small" icon={<KeyOutlined />} className="ve-reset-btn" onClick={() => openResetPassword(r.id)} />
                    </Tooltip>
                    <Popconfirm title="确认删除该用户？" onConfirm={() => remove(r.id)}>
                      <Tooltip title="删除">
                        <Button danger type="text" size="small" icon={<DeleteOutlined />} className="ve-delete-btn" />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        )}
        <Modal title="新增用户" open={open} centered className="ve-users-modal" onCancel={() => setOpen(false)} onOk={submit}>
          <Form form={form} layout="vertical">
            <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
              <Input className="ve-input" placeholder="登录用户名，唯一" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true }, { min: 6 }]}>
              <Input.Password className="ve-input" placeholder="至少 6 位" />
            </Form.Item>
            <Form.Item label="权限模板">
              <Select
                value={roleTemplate}
                className="ve-select"
                placeholder="选择权限模板"
                onChange={(v) => {
                  setRoleTemplate(v);
                  form.setFieldValue("role", v);
                }}
                options={[
                  { value: "admin", label: "管理员（全权限）" },
                  { value: "maintainer", label: "维保员（可录入/编辑维保与周期）" },
                  { value: "reader", label: "只读用户（仅查看）" },
                ]}
              />
            </Form.Item>
            <Form.Item label="角色" name="role" initialValue="reader" rules={[{ required: true }]}>
              <Select
                className="ve-select"
                placeholder="请选择角色"
                options={[
                  { value: "admin", label: "管理员" },
                  { value: "maintainer", label: "维保员" },
                  { value: "reader", label: "只读用户" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title="重置密码"
          open={pwdModalOpen}
          centered
          onCancel={() => setPwdModalOpen(false)}
          onOk={() => void submitResetPassword()}
          destroyOnClose
        >
          <Form form={pwdForm} layout="vertical">
            <Form.Item label="新密码" name="password" rules={[{ required: true }, { min: 6, message: "至少 6 位" }]}>
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
