import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { PollyUsageTracker } from '@/utils/polly-usage-tracker';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Import the dashboard component
import { PollyDashboard } from '@/components/common/PollyDashboard';
import { DashboardWithRefresh } from '@/components/common/DashboardWithRefresh';

// Server action for refreshing data
async function refreshStats(): Promise<void> {
  'use server';
  try {
    PollyUsageTracker.clearCache(); // Clear cache to force fresh fetch
    await PollyUsageTracker.getAllUsageStats(); // Just await it, don't return
  } catch (error) {
    console.error('Error refreshing stats:', error);
    throw new Error('Failed to refresh statistics');
  }
}
// Check if the user is an admin
async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error checking admin status:', error);
    return false;
  }
  
  return data.role === 'admin';
}

// Loading component
function LoadingState() {
  return (
    <Card className="w-full h-[80vh] flex items-center justify-center">
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading usage statistics...</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Error boundary component
function ErrorBoundary({ error }: { error: Error }) {
  return (
    <Card className="w-full p-6 bg-destructive/10">
      <CardContent>
        <h3 className="text-lg font-semibold text-destructive">Error Loading Dashboard</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {error.message || 'Failed to load usage statistics'}
        </p>
      </CardContent>
    </Card>
  );
}

async function DashboardWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    redirect('/unauthorized');
  }

  try {
    const { stats } = await PollyUsageTracker.getAllUsageStats();
    return (
      <DashboardWithRefresh
        usageStats={stats}
        refreshStats={refreshStats}
      />
    );
  } catch (error) {
    console.error('Error in DashboardWrapper:', error);
    return <ErrorBoundary error={error instanceof Error ? error : new Error('Unknown error')} />;
  }
}

// Main page component
export default async function AdminDashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<LoadingState />}>
        <DashboardWrapper />
      </Suspense>
    </div>
  );
}