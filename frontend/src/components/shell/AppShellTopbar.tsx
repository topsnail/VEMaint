import { Avatar, Badge, Button, Dropdown, Input, Space } from "@/components/ui/legacy";
import logoPng from "../../../favicon.png";
import { Bell, ChevronDown, LogOut, Search, User } from "lucide-react";
/** 顶栏左侧：Logo + 产品名 */
export function AppShellTopbarBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-white p-0.5">
        <img src={logoPng} alt="VEMaint Logo" className="h-full w-full object-contain" />
      </div>
      <div className="leading-tight">
        <div className="text-[18px] font-semibold tracking-tight text-[#1F2937]">VEMaint</div>
        <div className="text-[11px] leading-tight text-[#6B7280]">车辆与设备维保</div>
      </div>
    </div>
  );
}

export type AppShellTopbarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
};

/** 顶栏中部：全局搜索 */
export function AppShellTopbarSearch({ value, onChange, onSubmit }: AppShellTopbarSearchProps) {
  return (
    <div className="flex w-full min-w-0 justify-center">
      <div className="ve-topbar-search-wrap relative min-w-[240px]">
        <Input
          className="ve-topbar-search h-8 w-full pr-9"
          placeholder="搜索车牌、设备、维保记录..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={(e) => onSubmit((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          className="ve-topbar-search-inline-btn absolute right-2 top-1/2 -translate-y-1/2"
          onClick={() => onSubmit(value)}
          aria-label="搜索"
        >
          <span className="inline-flex items-center">
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </span>
        </button>
      </div>
    </div>
  );
}

export type AppShellTopbarAccountProps = {
  username: string;
  roleLabel?: string;
  notificationCount: number;
  onNotificationsClick: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

/** 顶栏右侧：通知 + 用户菜单 */
export function AppShellTopbarAccount({
  username,
  roleLabel,
  notificationCount,
  onNotificationsClick,
  onProfile,
  onLogout,
}: AppShellTopbarAccountProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge count={notificationCount} size="small" overflowCount={99} offset={[6, -4]}>
        <Button
          type="text"
          shape="circle"
          icon={<Bell className="h-5 w-5" strokeWidth={1.7} />}
          className="!text-[20px] !text-[#6B7280] hover:!bg-[#F3F4F6] hover:!text-[#1F2937]"
          onClick={onNotificationsClick}
        />
      </Badge>
      <Dropdown
        menu={{
          items: [
            { key: "profile", icon: <User className="h-4 w-4" strokeWidth={1.5} />, label: "个人中心" },
            { type: "divider" },
            { key: "logout", icon: <LogOut className="h-4 w-4" strokeWidth={1.5} />, label: "退出登录", danger: true },
          ],
          onClick: ({ key }) => {
            if (key === "profile") onProfile();
            if (key === "logout") void onLogout();
          },
        }}
        trigger={["click"]}
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-left focus-visible:outline-none"
        >
          <Avatar size={28} icon={<User className="h-4 w-4" strokeWidth={1.5} />} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-slate-800">{username}</span>
            {roleLabel ? <span className="truncate text-[11px] text-slate-500">{roleLabel}</span> : null}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
        </button>
      </Dropdown>
    </div>
  );
}
