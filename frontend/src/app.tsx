import { Bell, Car, FileText, Plus, Settings, Users, User } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const VehiclesPage = lazy(() => import("./pages/VehiclesPage").then((m) => ({ default: m.VehiclesPage })));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage").then((m) => ({ default: m.MaintenancePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const ConfigPage = lazy(() => import("./pages/ConfigPage").then((m) => ({ default: m.ConfigPage })));

function AppInner() {
  useEffect(() => {
    setGlobalErrorMessenger((text) => toast.error(text));
    return () => setGlobalErrorMessenger(null);
  }, []);

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
        { key: "/maintenance/vehicles", icon: <FileText className="h-4 w-4" strokeWidth={1.5} />, label: "车辆维保" },
        { key: "/maintenance/equipment", icon: <FileText className="h-4 w-4" strokeWidth={1.5} />, label: "设备维保" },
      ]
    : [];

  const items = [
    ...(canViewDashboard ? [{ key: "/dashboard", icon: <Bell className="h-4 w-4" strokeWidth={1.5} />, label: "仪表盘" }] : []),
    ...(canViewVehicles ? [{ key: "/vehicles", icon: <Car className="h-4 w-4" strokeWidth={1.5} />, label: "车辆台账" }] : []),
    ...maintenanceItems,
    ...(canManageConfig ? [{ key: "/config", icon: <Settings className="h-4 w-4" strokeWidth={1.5} />, label: "系统配置" }] : []),
  ];

  const quickActions = [
    ...(canManageVehicle ? [{ key: "new-vehicle", label: "新增车辆", target: "/vehicles?create=1" }] : []),
    ...(canEditMaintenance ? [{ key: "new-maint", label: "新增维保", target: "/maintenance/vehicles?create=1" }] : []),
  ];

  const mobileDockItems: MobileDockItem[] = [
    ...items.map((it) => ({ key: it.key, icon: it.icon, label: it.label })),
    ...(canManageUsers ? [{ key: "/users", icon: <Users className="h-4 w-4" strokeWidth={1.5} />, label: "用户" }] : []),
    { key: "/profile", icon: <User className="h-4 w-4" strokeWidth={1.5} />, label: "我的" },
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
    toast.success("已退出");
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
        <div className="text-xs uppercase tracking-wide text-[#6B7280]">概览</div>
        <div className="mt-2 space-y-1">
          {items.map((it) => {
            const active = loc.pathname === it.key;
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => nav(it.key)}
                className={`flex h-8 w-full items-center gap-2 rounded-sm px-2.5 text-sm transition ${
                  active ? "bg-blue-50 font-medium text-blue-600" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {it.icon}
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-[#6B7280]">快捷新增</div>
        <div className="mt-2 space-y-2">
          {quickActions.map((action) => (
            <Button
              key={action.key}
              fullWidth
              variant="outline"
              className="h-8 justify-start rounded-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => nav(action.target)}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {action.label}
            </Button>
          ))}
        </div>
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
        <Suspense
          fallback={
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          }
        >
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
    <>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </>
  );
}

