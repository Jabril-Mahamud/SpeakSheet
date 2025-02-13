'use client';

import { useRouter } from 'next/navigation';
import { PollyDashboard } from './PollyDashboard';
import { UserUsageStats } from '@/utils/types';

export function DashboardWithRefresh({ 
  usageStats, 
  refreshStats 
}: { 
  usageStats: UserUsageStats[];
  refreshStats: () => Promise<void>;
}) {
  const router = useRouter();

  const handleRefresh = async () => {
    await refreshStats();
    router.refresh(); // This will trigger a server-side revalidation
  };

  return (
    <PollyDashboard
      usageStats={usageStats}
      onRefresh={handleRefresh}
    />
  );
}