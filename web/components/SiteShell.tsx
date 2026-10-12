"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copilot } from "@/components/Copilot";

const LINKS = [
  ["/platform", "Platform"],
  ["/security", "Security"],
  ["/pricing", "Pricing"],
  ["/docs", "Docs"],
  ["/app", "Workspace"],
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <header className="nav">
        <nav className="nav-inner" aria-label="Primary">
          <Link href="/" className="brand">Bevel</Link>
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} data-active={pathname === href}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <Copilot />
    </>
  );
}
