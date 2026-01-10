'use client';

import { ReactNode } from 'react';
import { MainLayout } from '@/components/layout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
