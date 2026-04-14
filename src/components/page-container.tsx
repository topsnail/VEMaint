import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { uiLayout } from "@/lib/ui-style";

type PageContainerProps = {
  children: ReactNode;
  size?: "standard" | "wide" | "narrow" | "form";
  className?: string;
};

export function PageContainer({ children, size = "standard", className }: PageContainerProps) {
  return <div className={cn("mx-auto w-full", uiLayout.contentWidth[size], className)}>{children}</div>;
}

