"use client";

import { Button } from "@/components/ui/button";
import { promptVehicleLedgerPin } from "@/lib/vehicle-ledger-pin";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  editHref: string;
  className?: string;
  children?: ReactNode;
};

/** 带口令校验后跳转编辑页（与列表「修改」一致） */
export function VehicleLedgerEditNavButton({ editHref, className, children = "编辑" }: Props) {
  const router = useRouter();
  return (
    <Button
      type="button"
      className={className}
      onClick={() => {
        if (!promptVehicleLedgerPin()) return;
        router.push(editHref);
      }}
    >
      {children}
    </Button>
  );
}
