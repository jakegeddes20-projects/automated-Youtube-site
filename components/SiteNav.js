"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Queue"],
  ["/library", "Library"],
  ["/settings", "Settings"],
];

export default function SiteNav() {
  const path = usePathname();
  return (
    <header className="topbar">
      <Link className="brand" href="/">Content Pipeline</Link>
      <nav>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>{label}</Link>
        ))}
      </nav>
    </header>
  );
}
