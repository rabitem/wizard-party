import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AccountShell, Panel, ResetPasswordPanel } from '@/presentation/components/account';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AccountShell width="narrow">
      <Panel>
        <div className="p-5 sm:p-8">
          <Suspense>
            <ResetPasswordPanel />
          </Suspense>
        </div>
      </Panel>
    </AccountShell>
  );
}
