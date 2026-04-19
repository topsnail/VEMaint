// 前端配置文件

// API 配置
export const API_CONFIG = {
  BASE_URL: "/api",
  TIMEOUT: 30000, // 30秒超时
};

// 存储键名
export const STORAGE_KEYS = {
  TOKEN: "ve_token",
  USER: "ve_user",
  CSRF: "ve_csrf",
};

// 刷新间隔
export const REFRESH_INTERVALS = {
  DASHBOARD: 60000, // 1分钟
  NOTIFICATIONS: 30000, // 30秒
};

// 搜索配置
export const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 300, // 300ms防抖
};

// 密码强度规则
export const PASSWORD_RULES = {
  MIN_LENGTH: 6,
  REQUIRE_NUMBERS: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_UPPERCASE: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHARACTERS: "!@#$%^&*(),.?\":{}|<>" ,
};

// 预警级别
export const ALERT_LEVELS = {
  EXPIRED: "expired",
  WITHIN_7_DAYS: "within7",
  WITHIN_30_DAYS: "within30",
};

// 预警状态
export const ALERT_STATUS = {
  OPEN: "open",
  PROCESSING: "processing",
  RESOLVED: "resolved",
};

// 车辆状态
export const VEHICLE_STATUS = {
  NORMAL: "normal",
  REPAIRING: "repairing",
  SCRAPPED: "scrapped",
  STOPPED: "stopped",
};

// 维保类型
export const MAINTENANCE_TYPES = {
  ROUTINE: "routine",
  FAULT: "fault",
  ACCIDENT: "accident",
  PERIODIC: "periodic",
};

// 角色权限
export const ROLES = {
  ADMIN: "admin",
  MAINTAINER: "maintainer",
  READER: "reader",
};
