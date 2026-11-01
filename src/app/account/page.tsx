import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AccountView } from '@/presentation/components/account';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  );
}
