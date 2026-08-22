import type { PropsWithChildren } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import "./AppShell.css";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-shell__content">{children}</main>
      <BottomNav />
    </div>
  );
}
