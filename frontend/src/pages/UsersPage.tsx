import { App, Button, Form, Input, Modal, Popconfirm, Select, Skeleton, Space, Table, Tooltip } from "@/components/ui/legacy";
import { useEffect, useState } from "react";
import { PageContainer } from "../components/PageContainer";
import { useUsersAdmin } from "../hooks/useUsersAdmin";
import { actionBtn } from "../lib/ui/buttonTokens";
import { listTableScroll, listTableSticky } from "../lib/tableConfig";
import { Key, Trash2 } from "lucide-react";
import { getUser } from "../lib/auth";
import { requestOperationReason } from "../lib/operationReason";
import { fetchSettingsSnapshot } from "../hooks/useSettingsDropdowns";
import { useQuery } from "@tanstack/react-query";

type Model = { username: string; password: string; role: "admin" | "maintainer" | "reader" };
type RoleTemplate = "admin" | "maintainer" | "reader";

export function UsersPage() {
  const { message } = App.useApp();
  const currentUserId = getUser()?.userId ?? "";
  const { rows, loading, load, createUser, changeRole, removeUser, setDisabled, resetPassword } = useUsersAdmin();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Model>();
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplate>("reader");
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState<string | null>(null);
  const [pwdForm] = Form.useForm<{ password: string }>();
  const settingsQuery = useQuery({ queryKey: ["settings-snapshot"], queryFn: fetchSettingsSnapshot, refetchOnWindowFocus: false });
  const dropdowns = settingsQuery.data?.dropdowns ?? {};
  const roleLabels = {
    admin: dropdowns.userRole?.[0] ?? "管理员",
    maintainer: dropdowns.userRole?.[1] ?? "维保员",
    reader: dropdowns.userRole?.[2] ?? "只读用户",
  } as const;
  const roleOptions = [
    { value: "admin", label: roleLabels.admin },
    { value: "maintainer", label: roleLabels.maintainer },
    { value: "reader", label: roleLabels.reader },
  ] as const;
  const roleTemplateOptions = [
    {
      value: "admin",
      label: `${roleLabels.admin}${dropdowns.userRoleTemplateSuffix?.[0] ?? "（全权限）"}`,
    },
    {
      value: "maintainer",
      label: `${roleLabels.maintainer}${dropdowns.userRoleTemplateSuffix?.[1] ?? "（可录入/编辑维保与周期）"}`,
    },
    {
      value: "reader",
      label: `${roleLabels.reader}${dropdowns.userRoleTemplateSuffix?.[2] ?? "（仅查看）"}`,
    },
  ] as const;

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
    const reason = await requestOperationReason("请输入修改角色的理由");
    if (!reason) return;
    const res = await changeRole(id, role, reason);
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const remove = async (id: string) => {
    const reason = await requestOperationReason("请输入删除用户的理由");
    if (!reason) return;
    const res = await removeUser(id, reason);
    if (!res.ok) return message.error(res.error.message);
    message.success("删除成功");
    await load();
  };

  const onSetDisabled = async (id: string, disabled: boolean) => {
    const reason = await requestOperationReason(disabled ? "请输入禁用用户的理由" : "请输入启用用户的理由");
    if (!reason) return;
    const res = await setDisabled(id, disabled, reason);
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
    const reason = await requestOperationReason("请输入重置密码的理由");
    if (!reason) return;
    const res = await resetPassword(pwdUserId, v.password, reason);
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
        <Button type="primary" className={actionBtn.primary} onClick={() => setOpen(true)}>
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
                    options={roleOptions as unknown as Array<{ value: string; label: string }>}
                  />
                ),
              },
              { title: "创建时间", dataIndex: "created_at" },
              {
                title: "状态",
                render: (_, r) =>
                  r.disabled ? (
                    <Popconfirm title="确认启用该用户？" onConfirm={() => onSetDisabled(r.id, false)}>
                      <Button size="small" className={actionBtn.smallSuccess}>
                        启用
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Popconfirm title="确认禁用该用户？禁用后将无法登录。" onConfirm={() => onSetDisabled(r.id, true)}>
                      <Button size="small" className={actionBtn.smallDanger}>
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
                      <Button type="text" size="small" icon={<Key className="h-4 w-4" />} className={actionBtn.textNeutral} onClick={() => openResetPassword(r.id)} />
                    </Tooltip>
                    {r.id === currentUserId ? (
                      <Tooltip title="当前登录账号不可删除">
                        <Button type="text" size="small" icon={<Trash2 className="h-4 w-4" />} className={actionBtn.textDanger} disabled />
                      </Tooltip>
                    ) : (
                      <Tooltip title="删除">
                        <Popconfirm title="确认删除该用户？" onConfirm={() => remove(r.id)}>
                          <Button type="text" size="small" icon={<Trash2 className="h-4 w-4" />} className={actionBtn.textDanger} />
                        </Popconfirm>
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
        <Modal
          title="新增用户"
          open={open}
          centered
          className="ve-users-modal"
          onCancel={() => setOpen(false)}
          footer={
            <Space size={8}>
              <Button className={actionBtn.neutral} onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="primary" className={actionBtn.primary} onClick={() => void submit()}>
                保存
              </Button>
            </Space>
          }
        >
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
                options={roleTemplateOptions as unknown as Array<{ value: string; label: string }>}
              />
            </Form.Item>
            <Form.Item label="角色" name="role" initialValue="reader" rules={[{ required: true }]}>
              <Select
                className="ve-select"
                placeholder="请选择角色"
                options={roleOptions as unknown as Array<{ value: string; label: string }>}
              />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title="重置密码"
          open={pwdModalOpen}
          centered
          onCancel={() => setPwdModalOpen(false)}
          footer={
            <Space size={8}>
              <Button className={actionBtn.neutral} onClick={() => setPwdModalOpen(false)}>
                取消
              </Button>
              <Button type="primary" className={actionBtn.primary} onClick={() => void submitResetPassword()}>
                保存
              </Button>
            </Space>
          }
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
