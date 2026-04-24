import { Input, Modal } from "@/components/ui/legacy";
import { createRoot } from "react-dom/client";

export async function requestOperationReason(title = "请输入操作理由"): Promise<string | null> {
  return await new Promise<string | null>((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let reason = "";
    const cleanup = () => {
      root.unmount();
      host.remove();
    };
    const submit = () => {
      const value = reason.trim();
      if (!value) return;
      cleanup();
      resolve(value);
    };
    const cancel = () => {
      cleanup();
      resolve(null);
    };

    root.render(
      <Modal title={title} open centered onCancel={cancel} onOk={submit} okText="确认" cancelText="取消">
        <Input.TextArea
          autoFocus
          rows={4}
          placeholder="请填写本次高风险操作的原因（必填）"
          onChange={(e) => {
            reason = e.target.value;
          }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </Modal>,
    );
  });
}
