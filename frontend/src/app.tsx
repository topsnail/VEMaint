import {
  BellOutlined,
  CarOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Input, Layout, Menu, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  clearToken,
  getToken,
  getUser,
  setToken,
  setUser,
  type UserInfo,
} from "./lib/auth";
import { apiFetch } from "./lib/http";
import { DEFAULT_ROLE_PERMISSIONS, hasPerm, normalizeRolePermissions, type RolePermissions } from "./lib/permissions";
import { ConfigPage } from "./pages/ConfigPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { ProfilePage } from "./pages/ProfilePage";
import { UsersPage } from "./pages/UsersPage";
import { VehiclesPage } from "./pages/VehiclesPage";

function AppInner() {
  const fallbackUser: UserInfo = { userId: "mock_user_fallback", username: "mock", role: "admin" };
  const [user, setCurrentUser] = useState<UserInfo | null>(() => {
    const cachedUser = getUser();
    if (cachedUser) return cachedUser;

    const token = getToken();
    if (token?.startsWith("mock_token_")) return fallbackUser;
    return null;
  });
  const [rolePermissions, setRolePermissions] = useState<RolePermissions | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const nav = useNavigate();
  const loc = useLocation();

  const loadMe = async () => {
    const token = getToken();
    if (!token) return setCurrentUser(null);

    const cachedUser = getUser();

    // 仅前端模拟登录：跳过后端接口
    // 即使缓存用户为空，也用兜底 mock user 恢复 UI（避免刷新后回登录）
    if (token.startsWith("mock_token_")) {
      if (cachedUser) {
        setCurrentUser(cachedUser);
      } else {
        const fallbackUser = { userId: "mock_user_fallback", username: "mock", role: "admin" as const };
        setUser(fallbackUser);
        setCurrentUser(fallbackUser);
      }
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      return;
    }

    // 优先从缓存恢复 UI，避免刷新时后端不可用导致强制回登录页
    if (cachedUser) {
      setCurrentUser(cachedUser);
      // 缓存恢复时先用默认权限兜底；后续如果后端可用会覆盖
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    }

    try {
      const [userRes, settingsRes] = await Promise.all([
        apiFetch<{ userId: string; username: string; role: "admin" | "maintainer" | "reader" }>("/user/info"),
        apiFetch<{ config: { permissions?: { roles?: RolePermissions } } }>("/settings"),
      ]);

      if (!userRes.ok) {
        // 如果缓存用户存在，就保持当前界面；否则清 token 回到登录页
        if (cachedUser) return;
        clearToken();
        setCurrentUser(null);
        return;
      }

      setUser(userRes.data);
      setCurrentUser(userRes.data);
      if (settingsRes.ok) setRolePermissions(normalizeRolePermissions(settingsRes.data.config.permissions));
      else setRolePermissions(normalizeRolePermissions(null));
    } catch {
      // 网络/运行时错误时同样降级为使用缓存用户
      if (!cachedUser) {
        clearToken();
        setCurrentUser(null);
      }
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    const loadNotificationCount = async () => {
      if (!user) {
        setNotificationCount(0);
        return;
      }
      try {
        const res = await apiFetch<{ kpis?: { alerts?: { total?: number } } }>("/dashboard/overview");
        if (res.ok) {
          setNotificationCount(Number(res.data.kpis?.alerts?.total ?? 0));
          return;
        }
      } catch {
        // ignore and keep existing count
      }
    };
    void loadNotificationCount();
  }, [user]);

  if (!user) return <LoginPage onLoggedIn={loadMe} />;
  const canViewDashboard = hasPerm(user.role, "app.view", rolePermissions);
  const canViewVehicles = hasPerm(user.role, "vehicle.view", rolePermissions);
  const canManageVehicle = hasPerm(user.role, "vehicle.manage", rolePermissions);
  const canViewMaintenance = hasPerm(user.role, "maintenance.view", rolePermissions);
  const canEditMaintenance = hasPerm(user.role, "maintenance.edit", rolePermissions);
  const canDeleteMaintenance = hasPerm(user.role, "maintenance.delete", rolePermissions);
  const canManageUsers = hasPerm(user.role, "user.manage", rolePermissions);
  const canManageConfig = hasPerm(user.role, "config.manage", rolePermissions);
  const defaultPath = canViewDashboard
    ? "/dashboard"
    : canViewVehicles
      ? "/vehicles"
      : canViewMaintenance
        ? "/maintenance"
        : "/profile";

  const items = [
    ...(canViewDashboard ? [{ key: "/dashboard", icon: <BellOutlined />, label: "仪表盘" }] : []),
    ...(canViewVehicles ? [{ key: "/vehicles", icon: <CarOutlined />, label: "车辆台账" }] : []),
    ...(canViewMaintenance ? [{ key: "/maintenance", icon: <FileTextOutlined />, label: "维保记录" }] : []),
    ...(canManageConfig ? [{ key: "/config", icon: <SettingOutlined />, label: "系统配置" }] : []),
  ];

  const quickActions = [
    ...(canManageVehicle ? [{ key: "new-vehicle", label: "新增车辆", target: "/vehicles?create=1" }] : []),
    ...(canEditMaintenance ? [{ key: "new-maint", label: "新增维保", target: "/maintenance?create=1" }] : []),
  ];

  const submitGlobalSearch = (value: string) => {
    const keyword = value.trim();
    if (!keyword) return nav("/dashboard");
    nav(`/vehicles?q=${encodeURIComponent(keyword)}`);
  };

  const logout = async () => {
    await apiFetch("/logout", { method: "POST" });
    clearToken();
    setCurrentUser(null);
    message.success("已退出");
  };

  return (
    <Layout className="min-h-screen ve-shell">
      <Layout.Header className="ve-topbar">
        <div className="ve-topbar-left">
          <div>
            <img src="/favicon.png" alt="VEMaint Logo" className="h-8 w-8 object-contain" />
          </div>
          <Typography.Title level={5} className="!mb-0 !text-slate-900">
            VEMaint
          </Typography.Title>
        </div>
        <div className="ve-topbar-center">
          <Input
            className="ve-topbar-search"
            placeholder="搜索车牌、设备、维保记录..."
            allowClear
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onPressEnter={(e) => submitGlobalSearch((e.target as HTMLInputElement).value)}
            suffix={
              <button
                type="button"
                className="ve-topbar-search-inline-btn"
                onClick={() => submitGlobalSearch(globalSearch)}
              >
                <span className="ve-topbar-search-btn-content">
                  <SearchOutlined />
                </span>
              </button>
            }
          />
        </div>
        <div className="ve-topbar-right">
          <Badge count={notificationCount} size="small" overflowCount={99} offset={[-2, 2]}>
            <Button type="text" shape="circle" icon={<BellOutlined />} onClick={() => nav("/dashboard")} />
          </Badge>
          <Dropdown
            menu={{
              items: [
                { key: "profile", icon: <UserOutlined />, label: "个人中心" },
                { type: "divider" },
                { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
              ],
              onClick: ({ key }) => {
                if (key === "profile") nav("/profile");
                if (key === "logout") void logout();
              },
            }}
            trigger={["click"]}
          >
            <Space className="cursor-pointer rounded-md px-2 py-1 hover:bg-slate-50">
              <Avatar size="small" icon={<UserOutlined />} />
              <span className="text-slate-700">{user.username}</span>
            </Space>
          </Dropdown>
        </div>
      </Layout.Header>
      <Layout className="ve-main-layout">
        <Layout.Sider width={200} className="ve-left-sider">
          <div className="px-4 py-4">
            <Typography.Text className="text-xs uppercase tracking-wide text-slate-400">概览</Typography.Text>
            <Menu
              className="mt-2 rounded-lg border border-slate-200 bg-white"
              selectedKeys={[loc.pathname]}
              onClick={({ key }) => nav(key)}
              items={items}
              mode="inline"
            />
          </div>
          <div className="px-4 pb-4">
            <Typography.Text className="text-xs uppercase tracking-wide text-slate-400">快捷新增</Typography.Text>
            <Space direction="vertical" className="mt-2 w-full">
              {quickActions.map((action) => (
                <Button key={action.key} block icon={<PlusOutlined />} className="justify-start" onClick={() => nav(action.target)}>
                  {action.label}
                </Button>
              ))}
            </Space>
          </div>
        </Layout.Sider>
        <Layout.Content className="ve-content">
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route
              path="/dashboard"
              element={canViewDashboard ? <DashboardPage canHandleAlerts={canEditMaintenance} /> : <Navigate to={defaultPath} replace />}
            />
            <Route path="/vehicles" element={canViewVehicles ? <VehiclesPage canManage={canManageVehicle} /> : <Navigate to={defaultPath} replace />} />
            <Route
              path="/maintenance"
              element={
                canViewMaintenance ? <MaintenancePage canEdit={canEditMaintenance} canDelete={canDeleteMaintenance} /> : <Navigate to={defaultPath} replace />
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
            {canManageUsers ? <Route path="/users" element={<UsersPage />} /> : null}
            {canManageConfig ? <Route path="/config" element={<ConfigPage />} /> : null}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
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

