import { BellOutlined, CarOutlined, FileTextOutlined, PlusOutlined, SettingOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { App as AntdApp, Button, ConfigProvider, Menu, Skeleton, Space, Typography } from "antd";
import { Suspense, lazy, useEffect, useState } from "react";
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
import { DEFAULT_ROLE_PERMISSIONS, normalizeRolePermissions, type RolePermissions } from "./lib/permissions";
import { usePermissions } from "./lib/usePermissions";
import { AppShellTopbarAccount, AppShellTopbarBrand, AppShellTopbarSearch } from "./components/shell/AppShellTopbar";
import { DashboardLayout, type MobileDockItem } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/LoginPage";
import { setGlobalErrorMessenger } from "./lib/errorHandler";
import { veTheme } from "./theme";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const VehiclesPage = lazy(() => import("./pages/VehiclesPage").then((m) => ({ default: m.VehiclesPage })));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage").then((m) => ({ default: m.MaintenancePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const ConfigPage = lazy(() => import("./pages/ConfigPage").then((m) => ({ default: m.ConfigPage })));

function AppInner() {
  const { message } = AntdApp.useApp();
  useEffect(() => {
    setGlobalErrorMessenger((text) => message.error(text));
    return () => setGlobalErrorMessenger(null);
  }, [message]);

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

  const {
    canViewDashboard,
    canViewVehicles,
    canManageVehicle,
    canViewMaintenance,
    canEditMaintenance,
    canDeleteMaintenance,
    canManageUsers,
    canManageConfig,
  } = usePermissions(user, rolePermissions);

  if (!user) return <LoginPage onLoggedIn={loadMe} />;
  
  const defaultPath = canViewDashboard
    ? "/dashboard"
    : canViewVehicles
      ? "/vehicles"
      : canViewMaintenance
        ? "/maintenance/vehicles"
        : "/profile";

  const maintenanceItems = canViewMaintenance
    ? [
        { key: "/maintenance/vehicles", icon: <FileTextOutlined />, label: "车辆维保" },
        { key: "/maintenance/equipment", icon: <FileTextOutlined />, label: "设备维保" },
      ]
    : [];

  const items = [
    ...(canViewDashboard ? [{ key: "/dashboard", icon: <BellOutlined />, label: "仪表盘" }] : []),
    ...(canViewVehicles ? [{ key: "/vehicles", icon: <CarOutlined />, label: "车辆台账" }] : []),
    ...maintenanceItems,
    ...(canManageConfig ? [{ key: "/config", icon: <SettingOutlined />, label: "系统配置" }] : []),
  ];

  const quickActions = [
    ...(canManageVehicle ? [{ key: "new-vehicle", label: "新增车辆", target: "/vehicles?create=1" }] : []),
    ...(canEditMaintenance ? [{ key: "new-maint", label: "新增维保", target: "/maintenance/vehicles?create=1" }] : []),
  ];

  const mobileDockItems: MobileDockItem[] = [
    ...items.map((it) => ({ key: it.key, icon: it.icon, label: it.label })),
    ...(canManageUsers ? [{ key: "/users", icon: <TeamOutlined />, label: "用户" }] : []),
    { key: "/profile", icon: <UserOutlined />, label: "我的" },
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

  const shellHeaderLeft = <AppShellTopbarBrand />;

  const shellHeaderCenter = (
    <AppShellTopbarSearch value={globalSearch} onChange={setGlobalSearch} onSubmit={submitGlobalSearch} />
  );

  const shellHeaderRight = (
    <AppShellTopbarAccount
      username={user.username}
      notificationCount={notificationCount}
      onNotificationsClick={() => nav("/dashboard")}
      onProfile={() => nav("/profile")}
      onLogout={logout}
    />
  );

  const shellSider = (
    <div className="space-y-4">
      <div>
        <Typography.Text className="text-xs uppercase tracking-wide text-[#6B7280]">概览</Typography.Text>
        <Menu
          className="mt-2 !border-0 !bg-transparent"
          selectedKeys={[loc.pathname]}
          onClick={({ key }) => nav(key)}
          items={items}
          mode="inline"
        />
      </div>
      <div>
        <Typography.Text className="text-xs uppercase tracking-wide text-[#6B7280]">快捷新增</Typography.Text>
        <Space direction="vertical" className="mt-2 w-full">
          {quickActions.map((action) => (
            <Button
              key={action.key}
              block
              icon={<PlusOutlined />}
              className="!h-10 !justify-start !rounded-lg !border-[#E5E7EB] !bg-white !text-[#1F2937] hover:!bg-[#F9FAFB]"
              onClick={() => nav(action.target)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      headerLeft={shellHeaderLeft}
      headerCenter={shellHeaderCenter}
      headerRight={shellHeaderRight}
      sider={shellSider}
      mobileDockItems={mobileDockItems}
    >
      <div className="min-h-[calc(100vh-160px)]">
        <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>
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
                canViewMaintenance ? <MaintenancePage canEdit={canEditMaintenance} canDelete={canDeleteMaintenance} view="all" /> : <Navigate to={defaultPath} replace />
              }
            />
            <Route
              path="/maintenance/vehicles"
              element={
                canViewMaintenance ? <MaintenancePage canEdit={canEditMaintenance} canDelete={canDeleteMaintenance} view="vehicle" /> : <Navigate to={defaultPath} replace />
              }
            />
            <Route
              path="/maintenance/equipment"
              element={
                canViewMaintenance ? <MaintenancePage canEdit={canEditMaintenance} canDelete={canDeleteMaintenance} view="equipment" /> : <Navigate to={defaultPath} replace />
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
            {canManageUsers ? <Route path="/users" element={<UsersPage />} /> : null}
            {canManageConfig ? <Route path="/config" element={<ConfigPage />} /> : null}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

export function App() {
  return (
    <ConfigProvider theme={veTheme}>
      <AntdApp>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

