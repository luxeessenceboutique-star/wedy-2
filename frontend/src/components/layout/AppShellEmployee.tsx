import React from 'react';
import { PortalNav } from './PortalNav';

/** Employee-portal shell: sticky top nav instead of the sidebar. */
export function AppShellEmployee({ children }: { children: React.ReactNode }) {
  return (
    <div className="wy-portal">
      <PortalNav />
      <main className="wy-portal-main">{children}</main>
    </div>
  );
}
