import React from 'react';
import { PortalNav } from './PortalNav';
import { useIdleLogout } from '@/lib/useIdleLogout';

/** Employee-portal shell: sticky top nav instead of the sidebar. */
export function AppShellEmployee({ children }: { children: React.ReactNode }) {
  useIdleLogout();
  return (
    <div className="wy-portal">
      <PortalNav />
      <main className="wy-portal-main">{children}</main>
    </div>
  );
}
