# Button Tokens Guide

This project uses `actionBtn` from `frontend/src/lib/ui/buttonTokens.ts` as the unified button style source.

## Quick Mapping

- `actionBtn.primary`: main action (`保存`, `新增`, `确认`)
- `actionBtn.secondary`: secondary emphasized action (same brand color family)
- `actionBtn.neutral`: neutral action (`取消`, `返回`)
- `actionBtn.ghost`: lightweight utility action (`查看`, helper actions)
- `actionBtn.link`: link-like tools (`导出`, `查看日志`)
- `actionBtn.textNeutral`: neutral icon/text row action (`编辑`, `重置`)
- `actionBtn.textDanger`: destructive icon/text row action (`删除`)
- `actionBtn.smallNeutral`: compact neutral action in dense areas (`全选`, `清空`)
- `actionBtn.smallSuccess`: compact positive action (`启用`)
- `actionBtn.smallDanger`: compact negative action (`禁用`)

## Usage Example

```tsx
import { Button } from "@/components/ui/legacy";
import { actionBtn } from "../lib/ui/buttonTokens";

export function ExampleActions() {
  return (
    <>
      <Button type="primary" className={actionBtn.primary}>保存</Button>
      <Button className={actionBtn.neutral}>取消</Button>
      <Button type="text" className={actionBtn.textDanger}>删除</Button>
    </>
  );
}
```

## Selection Rules

- Prefer semantic choice by intent, not by visual preference.
- In one action group, keep at most one `primary`.
- Destructive operations should use `textDanger` or `smallDanger`.
- Avoid adding new per-page button classes when a token already fits.
