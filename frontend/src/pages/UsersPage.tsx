import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, message } from "antd";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/http";
import type { UserRow } from "../types";

type Model = { username: string; password: string; role: "admin" | "maintainer" | "reader" };

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Model>();

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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={() => setOpen(true)}>
          新增用户
        </Button>
      </div>
      <Table
        className="ve-table"
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
                <Button size="small" onClick={() => setDisabled(r.id, false)}>
                  启用
                </Button>
              ) : (
                <Button size="small" danger onClick={() => setDisabled(r.id, true)}>
                  禁用
                </Button>
              ),
          },
          {
            title: "操作",
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => resetPassword(r.id)}>
                  改密
                </Button>
                <Popconfirm title="确认删除该用户？" onConfirm={() => remove(r.id)}>
                  <Button danger size="small">
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal title="新增用户" open={open} onCancel={() => setOpen(false)} onOk={submit}>
        <Form form={form} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="角色" name="role" initialValue="reader" rules={[{ required: true }]}>
            <Select
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

