/**
 * 车辆台账「修改 / 删除」前端操作口令（防误触，非服务端鉴权）。
 * 若需真正权限控制，应在 Server Action / KV 中校验角色或独立密钥。
 */
export const VEHICLE_LEDGER_ACTION_PIN = "8989";

/** @returns 是否通过校验（取消或错误均为 false） */
export function promptVehicleLedgerPin(): boolean {
  const input = window.prompt("请输入操作密码");
  if (input === null) return false;
  if (input !== VEHICLE_LEDGER_ACTION_PIN) {
    window.alert("密码错误");
    return false;
  }
  return true;
}
