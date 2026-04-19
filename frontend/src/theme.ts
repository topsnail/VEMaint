import type { ThemeConfig } from "antd";

export const veTheme: ThemeConfig = {
  cssVar: true,
  hashed: true,
  token: {
    // 2026.md: compact tool UI, 2K friendly
    fontSize: 16,
    controlHeight: 40,
    controlHeightSM: 36,
    controlHeightLG: 48,

    borderRadius: 8,
    borderRadiusSM: 8,
    borderRadiusLG: 8,

    // 2026.md: light only
    colorBgBase: "#F5F7FA",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorBorder: "#E5E7EB",
    colorSplit: "#E5E7EB",

    colorText: "#1F2937",
    colorTextSecondary: "#6B7280",
    colorTextTertiary: "#6B7280",
    colorTextQuaternary: "#9CA3AF",

    // 2026.md: keep AntD default primary
    colorPrimary: "#1677FF",
    colorInfo: "#1677FF",
    colorLink: "#1677FF",
    colorLinkHover: "#4096FF",

    // Prefer borders over heavy shadows
    boxShadow: "none",
    boxShadowSecondary: "none",
    lineWidth: 1,
  },
  components: {
    Layout: {
      bodyBg: "#F5F7FA",
      headerBg: "#FFFFFF",
      siderBg: "#FFFFFF",
      triggerBg: "#FFFFFF",
    },
    Menu: {
      itemHeight: 40,
      itemBorderRadius: 8,
      itemBg: "transparent",
      itemHoverBg: "#F3F4F6",
      itemSelectedBg: "rgba(22,119,255,0.10)",
      itemSelectedColor: "#1677FF",
      subMenuItemBg: "transparent",
    },
    Card: {
      paddingLG: 16,
      headerBg: "transparent",
    },
    Table: {
      headerBg: "#F9FAFB",
      headerSplitColor: "#E5E7EB",
      rowHoverBg: "#F9FAFB",
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      borderColor: "#E5E7EB",
    },
    Input: {
      paddingInline: 12,
      paddingBlock: 8,
      colorBgContainer: "#FFFFFF",
      activeBg: "#FFFFFF",
    },
    Select: {
      colorBgContainer: "#FFFFFF",
    },
    Button: {
      controlHeight: 40,
      borderRadius: 8,
      defaultBg: "#FFFFFF",
      defaultBorderColor: "#E5E7EB",
      defaultHoverBg: "#F9FAFB",
      primaryShadow: "none",
    },
    Modal: {
      contentBg: "#FFFFFF",
      headerBg: "#FFFFFF",
      footerBg: "#FFFFFF",
    },
    Tag: {
      defaultBg: "transparent",
      defaultColor: "#1F2937",
    },
    Typography: {
      titleMarginTop: 0,
      titleMarginBottom: 0,
    },
  },
};

