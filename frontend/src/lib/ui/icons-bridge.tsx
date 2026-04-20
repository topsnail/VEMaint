// @ts-nocheck
import {
  Bell,
  Car,
  FileText,
  Plus,
  Settings,
  Users,
  User,
  Menu,
  LogOut,
  Search,
  Inbox,
  Pencil,
  Trash2,
  Eye,
  Download,
  Wrench,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  EyeOff,
  Lock,
  Key,
  Share2,
  MinusCircle,
} from "lucide-react";
import type { ComponentType } from "react";

const withIcon =
  (Comp: ComponentType<any>) =>
  ({ className }: { className?: string }) =>
    <Comp className={className ?? "h-4 w-4"} />;

export const BellOutlined = withIcon(Bell);
export const CarOutlined = withIcon(Car);
export const FileTextOutlined = withIcon(FileText);
export const PlusOutlined = withIcon(Plus);
export const SettingOutlined = withIcon(Settings);
export const TeamOutlined = withIcon(Users);
export const UserOutlined = withIcon(User);
export const MenuOutlined = withIcon(Menu);
export const LogoutOutlined = withIcon(LogOut);
export const SearchOutlined = withIcon(Search);
export const InboxOutlined = withIcon(Inbox);
export const EditOutlined = withIcon(Pencil);
export const DeleteOutlined = withIcon(Trash2);
export const EyeOutlined = withIcon(Eye);
export const DownloadOutlined = withIcon(Download);
export const ToolOutlined = withIcon(Wrench);
export const SafetyOutlined = withIcon(Shield);
export const WarningOutlined = withIcon(AlertTriangle);
export const CheckCircleOutlined = withIcon(CheckCircle2);
export const ClockCircleOutlined = withIcon(Clock3);
export const EyeInvisibleOutlined = withIcon(EyeOff);
export const LockOutlined = withIcon(Lock);
export const KeyOutlined = withIcon(Key);
export const ShareAltOutlined = withIcon(Share2);
export const MinusCircleOutlined = withIcon(MinusCircle);
