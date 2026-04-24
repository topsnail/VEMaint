export async function requestOperationReason(_title = "请输入操作理由"): Promise<string | null> {
  // Keep call sites compatible while removing blocking reason dialog.
  return "系统自动记录";
}
