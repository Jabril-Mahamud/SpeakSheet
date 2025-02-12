'use client';

import { UserUsageStats } from '@/utils/polly-usage-tracker';
import { useRouter } from 'next/navigation';
import { PollyDashboard } from './PollyDashboard';

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