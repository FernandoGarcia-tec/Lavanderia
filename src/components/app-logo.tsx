import { cn } from "@/lib/utils";
import Link from "next/link";

export function AppLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 font-headline text-2xl font-bold text-primary",
        className
      )}
    >
      {/* Logo SVG icon */}
     
      <span>Lavanderia "ANGY"</span>
    </Link>
  );
}
