import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

export function BrandLogo({ className, compact = false, inverse = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/brand/fulfillos-mark.png"
        alt=""
        width={44}
        height={44}
        priority
        className="h-11 w-11 rounded-xl ring-1 ring-black/10"
      />
      {!compact && (
        <span>
          <span className={cn("block text-xl font-extrabold tracking-tight", inverse ? "text-white" : "text-[#162033]")}>FulfillOS</span>
          <span className={cn("block text-[11px] font-medium tracking-wide", inverse ? "text-slate-300" : "text-slate-500")}>Fulfillment Operations Platform</span>
        </span>
      )}
    </span>
  );
}
