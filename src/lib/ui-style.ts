/**
 * 页面级样式令牌：用于统一“紧凑布局 + 一致交互”。
 * 后续若需整体调密度，优先改这里，避免分散改多处页面。
 */
export const uiLayout = {
  contentWidth: {
    standard: "max-w-6xl",
    wide: "max-w-[1920px]",
    narrow: "max-w-5xl",
    form: "max-w-3xl",
  },
  pageContainer: "mx-auto w-full max-w-6xl space-y-5",
  pageHeaderWrap: "mb-6",
  pageSection: "mb-8 space-y-5",
  pageFormShell: "w-full space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6",
  filterPanelGrid: "grid gap-2 p-3",
  sectionCard: "space-y-4 rounded-lg border border-slate-200 p-4",
} as const;

export const uiAction = {
  buttonCompact: "h-8 text-xs",
  buttonTiny: "h-7 px-2 text-[11px]",
  buttonPagination: "h-8 min-w-[4.5rem] px-3 text-xs",
  buttonSheetFooter: "h-8",
  buttonMobilePrimary: "h-9 w-full text-sm",
} as const;

// 兼容旧命名：避免全项目大面积改引用
export const pageContainerClass = uiLayout.pageContainer;
export const pageHeaderWrapClass = uiLayout.pageHeaderWrap;
export const pageSectionClass = uiLayout.pageSection;
export const pageFormShellClass = uiLayout.pageFormShell;
export const filterPanelGridClass = uiLayout.filterPanelGrid;
export const sectionCardClass = uiLayout.sectionCard;

export const compactActionButtonClass = uiAction.buttonCompact;
export const compactTinyButtonClass = uiAction.buttonTiny;
export const compactPaginationButtonClass = uiAction.buttonPagination;
export const compactSheetFooterButtonClass = uiAction.buttonSheetFooter;
export const compactMobileActionButtonClass = uiAction.buttonMobilePrimary;
