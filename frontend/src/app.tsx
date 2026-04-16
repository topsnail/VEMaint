import { BellOutlined, CarOutlined, FileTextOutlined, SettingOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Layout, Menu, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  canDeleteMaintenance,
  canEditMaintenance,
  canManageUsers,
  canManageVehicles,
  clearToken,
  getToken,
  getUser,
  setUser,
  type UserInfo,
} from "./lib/auth";
import { apiFetch } from "./lib/http";
import { ConfigPage } from "./pages/ConfigPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { ProfilePage } from "./pages/ProfilePage";
import { UsersPage } from "./pages/UsersPage";
import { VehiclesPage } from "./pages/VehiclesPage";

function AppInner() {
  const [user, setCurrentUser] = useState<UserInfo | null>(() => getUser());
  const nav = useNavigate();
  const loc = useLocation();

  const loadMe = async () => {
    if (!getToken()) return setCurrentUser(null);
    const res = await apiFetch<{ userId: string; username: string; role: "admin" | "maintainer" | "reader" }>("/user/info");
    if (!res.ok) {
      clearToken();
      return setCurrentUser(null);
    }
    setUser(res.data);
    setCurrentUser(res.data);
  };

  useEffect(() => {
    loadMe();
  }, []);

  if (!user) return <LoginPage onLoggedIn={loadMe} />;

  const items = [
    { key: "/dashboard", icon: <BellOutlined />, label: "预警中心" },
    { key: "/vehicles", icon: <CarOutlined />, label: "车辆台账" },
    { key: "/maintenance", icon: <FileTextOutlined />, label: "维保记录" },
    { key: "/profile", icon: <UserOutlined />, label: "个人中心" },
    ...(canManageUsers(user.role) ? [{ key: "/users", icon: <TeamOutlined />, label: "用户管理" }] : []),
    ...(canManageUsers(user.role) ? [{ key: "/config", icon: <SettingOutlined />, label: "系统配置" }] : []),
  ];

  return (
    <Layout className="min-h-screen">
      <Layout.Sider width={220} className="flex h-screen flex-col">
        <div className="px-4 py-4 text-white">
          <Typography.Text className="!text-white">VEMaint</Typography.Text>
        </div>
        <Menu
          className="flex-1"
          theme="dark"
          selectedKeys={[loc.pathname]}
          onClick={({ key }) => nav(key)}
          items={items}
          mode="inline"
        />
        <div className="border-t border-slate-700 px-4 py-4 text-white">
          <Space direction="vertical" size={4}>
            <Space>
              <UserOutlined />
              <span>{user.username}</span>
              <span className="text-slate-400">({user.role})</span>
            </Space>
            <Button
              block
              onClick={async () => {
                await apiFetch("/logout", { method: "POST" });
                clearToken();
                setCurrentUser(null);
                message.success("已退出");
              }}
            >
              退出登录
            </Button>
          </Space>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Content className="p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vehicles" element={<VehiclesPage canManage={canManageVehicles(user.role)} />} />
            <Route
              path="/maintenance"
              element={<MaintenancePage canEdit={canEditMaintenance(user.role)} canDelete={canDeleteMaintenance(user.role)} />}
            />
            <Route path="/profile" element={<ProfilePage />} />
            {canManageUsers(user.role) ? <Route path="/users" element={<UsersPage />} /> : null}
            {canManageUsers(user.role) ? <Route path="/config" element={<ConfigPage />} /> : null}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

