import type { ThemeConfig } from "antd";

/** Ant Design 全局主题：与 Tailwind/CSS 变量对齐，单一事实来源（DRY） */
export const veTheme: ThemeConfig = {
  cssVar: true,
  hashed: true,
  token: {
    // 1080P 正文 14px；标题由 Typography / 页面级控制 16–20
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,

    controlHeight: 40,
    controlHeightSM: 36,
    controlHeightLG: 48,

    borderRadius: 6,
    borderRadiusSM: 6,
    borderRadiusLG: 6,

    colorBgBase: "#f8fafc",
    colorBgLayout: "#f8fafc",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBorder: "#e5e7eb",
    colorSplit: "#e5e7eb",

    colorText: "#1f2937",
    colorTextSecondary: "#6b7280",
    colorTextTertiary: "#6b7280",
    colorTextQuaternary: "#9ca3af",

    colorPrimary: "#1677ff",
    colorInfo: "#1677ff",
    colorLink: "#1677ff",
    colorLinkHover: "#4096ff",

    boxShadow: "none",
    boxShadowSecondary: "none",
    lineWidth: 1,
  },
  components: {
    Layout: {
      bodyBg: "#f8fafc",
      headerBg: "#ffffff",
      siderBg: "#ffffff",
      triggerBg: "#ffffff",
    },
    Menu: {
      itemHeight: 40,
      itemBorderRadius: 6,
      itemBg: "transparent",
      itemHoverBg: "#f3f4f6",
      itemSelectedBg: "rgba(22, 119, 255, 0.1)",
      itemSelectedColor: "#1677ff",
      subMenuItemBg: "transparent",
    },
    Card: {
      borderRadiusLG: 6,
      paddingLG: 16,
      headerBg: "transparent",
    },
    Table: {
      borderRadiusLG: 6,
      headerBg: "#f8fafc",
      headerSplitColor: "transparent",
      headerColor: "#334155",
      rowHoverBg: "#f3f4f6",
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      borderColor: "#f0f0f0",
    },
    Input: {
      borderRadius: 6,
      paddingInline: 12,
      paddingBlock: 8,
      colorBgContainer: "#ffffff",
      activeBg: "#ffffff",
    },
    Select: {
      borderRadius: 6,
      colorBgContainer: "#ffffff",
    },
    Button: {
      borderRadius: 6,
      borderRadiusLG: 6,
      controlHeight: 40,
      defaultBg: "#ffffff",
      defaultBorderColor: "#e5e7eb",
      defaultHoverBg: "#f9fafb",
      primaryShadow: "none",
    },
    Modal: {
      borderRadiusLG: 6,
      contentBg: "#ffffff",
      headerBg: "#ffffff",
      footerBg: "#ffffff",
    },
    Tag: {
      borderRadiusSM: 6,
      defaultBg: "transparent",
      defaultColor: "#1f2937",
    },
    Typography: {
      titleMarginTop: 0,
      titleMarginBottom: 0,
    },
  },
};
