import { DeleteOutlined, KeyOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tooltip, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/http";
import type { UserRow } from "../types";

type Model = { username: string; password: string; role: "admin" | "maintainer" | "reader" };
type RoleTemplate = "admin" | "maintainer" | "reader";

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Model>();
  const [roleTemplate, setRoleTemplate] = useState<RoleTemplate>("reader");

  const load = async () => {
    const res = await apiFetch<{ users: UserRow[] }>("/users");
    if (res.ok) setRows(res.data.users);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    const res = await apiFetch<{ ok: true }>("/users", { method: "POST", body: JSON.stringify(v) });
    if (!res.ok) return message.error(res.error.message);
    message.success("创建成功");
    setOpen(false);
    form.resetFields();
    setRoleTemplate("reader");
    await load();
  };

  const changeRole = async (id: string, role: Model["role"]) => {
    const res = await apiFetch<{ ok: true }>(`/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const remove = async (id: string) => {
    const res = await apiFetch<{ ok: true }>(`/users/${id}`, { method: "DELETE" });
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const setDisabled = async (id: string, disabled: boolean) => {
    const res = await apiFetch<{ ok: true }>(`/users/${id}/disabled`, {
      method: "PUT",
      body: JSON.stringify({ disabled }),
    });
    if (!res.ok) return message.error(res.error.message);
    await load();
  };

  const resetPassword = async (id: string) => {
    const pwd = window.prompt("请输入新密码（至少6位）");
    if (!pwd) return;
    const res = await apiFetch<{ ok: true }>(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password: pwd }),
    });
    if (!res.ok) return message.error(res.error.message);
    message.success("密码已更新");
  };

  return (
    <div className="ve-users-page space-y-4">
      <div className="ve-users-header flex justify-end">
        <Button type="primary" className="ve-primary-btn" onClick={() => setOpen(true)}>
          新增用户
        </Button>
      </div>
      <Table
        className="ve-users-table ve-table"
        size="small"
        tableLayout="auto"
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: "用户名", dataIndex: "username" },
          {
            title: "角色",
            render: (_, r) => (
              <Select
                value={r.role}
                className="ve-role-select"
                style={{ width: 140 }}
                onChange={(v) => changeRole(r.id, v)}
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
                <Button size="small" className="ve-enable-btn" onClick={() => setDisabled(r.id, false)}>
                  启用
                </Button>
              ) : (
                <Button size="small" danger className="ve-disable-btn" onClick={() => setDisabled(r.id, true)}>
                  禁用
                </Button>
              ),
          },
          {
            title: "操作",
            render: (_, r) => (
              <Space size={6}>
                <Tooltip title="重置密码">
                  <Button type="text" size="small" icon={<KeyOutlined />} className="ve-reset-btn" onClick={() => resetPassword(r.id)} />
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
      <Modal title="新增用户" open={open} className="ve-users-modal" onCancel={() => setOpen(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input className="ve-input" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password className="ve-input" />
          </Form.Item>
          <Form.Item label="权限模板">
            <Select
              value={roleTemplate}
              className="ve-select"
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
              options={[
                { value: "admin", label: "管理员" },
                { value: "maintainer", label: "维保员" },
                { value: "reader", label: "只读用户" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

