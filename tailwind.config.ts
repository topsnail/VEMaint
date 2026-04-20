import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./frontend/index.html", "./frontend/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        /** 全局统一使用 4px 圆角 */
        main: "4px",
      },
      colors: {
        /** 主色：Blue-600 (#2563eb) */
        primary: "#2563eb",
        page: "#f8fafc",
      },
      fontSize: {
        /** 基础正文：14px */
        body: ["14px", { lineHeight: "1.5715" }],
        /** 表头、标签、次要说明：12px */
        xs: ["12px", { lineHeight: "1.5" }],
        /** 页面小标题 */
        heading: ["16px", { lineHeight: "1.5", fontWeight: "600" }],
        /** 模块标题 */
        "heading-lg": ["20px", { lineHeight: "1.4", fontWeight: "600" }],
      },
      spacing: {
        /** 语义化 8px 网格（与 `p-2` / `p-4` / `p-6` 等价，便于跨组件统一命名） */
        "layout-xs": "8px",
        "layout-sm": "16px",
        "layout-md": "24px",
        "layout-lg": "32px",
        "layout-xl": "40px",
      },
    },
  },
  plugins: [animate],
};

export default config;
