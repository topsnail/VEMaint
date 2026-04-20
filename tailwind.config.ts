import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./frontend/index.html", "./frontend/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        /** 与 Ant Design `token.borderRadius` 统一为 6px */
        main: "6px",
      },
      colors: {
        /** 与 `veTheme.token.colorPrimary` 对齐，供 Tailwind 原子类复用 */
        primary: "#1677ff",
        page: "#f8fafc",
      },
      fontSize: {
        /** 1080P 正文；与 AntD `fontSize` 一致 */
        body: ["14px", { lineHeight: "1.5715" }],
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
      boxShadow: {
        /** 轻阴影层级，避免页面硬编码 rgba */
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        "card-md": "0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-lg": "0 4px 12px 0 rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
