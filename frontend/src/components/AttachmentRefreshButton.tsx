import { Button } from "@/components/ui/legacy";
import { actionBtn } from "../lib/ui/buttonTokens";

type Props = {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
};

export function AttachmentRefreshButton({ disabled, onClick, label = "刷新附件" }: Props) {
  return (
    <Button className={actionBtn.smallNeutral} disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}

