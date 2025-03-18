"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto">
        <div className="flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2 font-bold">
            <span>Cargo Queue</span>
          </Link>

          <div className="flex gap-6">
            <Link
              href="/"
              className={cn(
                "text-sm transition-colors hover:text-primary",
                isActive("/") ? "text-primary" : "text-muted-foreground"
              )}
            >
              Queues
            </Link>
            <Link
              href="/topics"
              className={cn(
                "text-sm transition-colors hover:text-primary",
                isActive("/topics") ? "text-primary" : "text-muted-foreground"
              )}
            >
              Topics
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
