import { Avatar, Badge, Button, Dropdown, Input, Space } from "@/components/ui/legacy";
import logoPng from "../../../favicon.png";
import { Bell, LogOut, Search, User } from "lucide-react";
/** 顶栏左侧：Logo + 产品名 */
export function AppShellTopbarBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-white p-0.5">
        <img src={logoPng} alt="VEMaint Logo" className="h-full w-full object-contain" />
      </div>
      <div className="leading-tight">
        <div className="text-[18px] font-semibold tracking-tight text-[#1F2937]">VEMaint</div>
        <div className="text-[12px] leading-snug text-[#6B7280]">车辆与设备维保</div>
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
    <div className="flex justify-start">
      <Input
        className="ve-topbar-search h-8 w-64"
        placeholder="搜索车牌、设备、维保记录..."
        allowClear
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={(e) => onSubmit((e.target as HTMLInputElement).value)}
        suffix={
          <button type="button" className="ve-topbar-search-inline-btn" onClick={() => onSubmit(value)}>
            <span className="inline-flex items-center">
              <Search className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </button>
        }
      />
    </div>
  );
}

export type AppShellTopbarAccountProps = {
  username: string;
  notificationCount: number;
  onNotificationsClick: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

/** 顶栏右侧：通知 + 用户菜单 */
export function AppShellTopbarAccount({
  username,
  notificationCount,
  onNotificationsClick,
  onProfile,
  onLogout,
}: AppShellTopbarAccountProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge count={notificationCount} size="small" overflowCount={99} offset={[-6, 6]}>
        <Button
          type="text"
          shape="circle"
          icon={<Bell className="h-4 w-4" strokeWidth={1.5} />}
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
        <Space className="cursor-pointer rounded-lg bg-white px-3 py-2 hover:bg-[#F9FAFB]">
          <Avatar size={28} icon={<User className="h-4 w-4" strokeWidth={1.5} />} />
          <span className="text-[#1F2937]">{username}</span>
        </Space>
      </Dropdown>
    </div>
  );
}
