"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLibrary =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/test/") ||
    pathname.startsWith("/growth");

  if (isLibrary) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
