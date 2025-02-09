import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { PollyUsageTracker } from '@/utils/polly-usage-tracker';
import PollyDashboard from '@/components/common/PollyDashboard';

// Check if the user is an admin
async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  
  return data.role === 'admin';
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect if not authenticated
  if (!user) {
    return redirect('/login');
  }

  // Check admin status
  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    return redirect('/unauthorized');
  }

  // Fetch usage statistics
  const usageStats = await PollyUsageTracker.getAllUsageStats();

  return <PollyDashboard usageStats={usageStats} />;
}