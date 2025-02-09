import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { PollyUsageTracker } from '@/utils/polly-usage-tracker';
import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  BookOpenIcon, 
  UserIcon, 
  ChartBarIcon, 
  CloudIcon, 
  CogIcon 
} from 'lucide-react';

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

// Fetch overview statistics
async function getAdminOverview() {
  const supabase = await createClient();
  
  // Fetch total user count
  const { count: totalUsers, error: userError } = await supabase
    .from('users')
    .select('*', { count: 'exact' });

  // Fetch total files
  const { count: totalFiles, error: fileError } = await supabase
    .from('files')
    .select('*', { count: 'exact' });

  // Fetch Polly usage overview
  const pollyStats = await PollyUsageTracker.getAllUsageStats();
  const totalCharactersSynthesized = pollyStats.reduce(
    (sum, userStats) => sum + userStats.daily.totalCharacters, 
    0
  );

  return {
    totalUsers: totalUsers ?? 0,
    totalFiles: totalFiles ?? 0,
    totalCharactersSynthesized
  };
}

export default async function AdminDashboardPage(): Promise<ReactNode> {
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

  // Fetch overview statistics
  const overview = await getAdminOverview();

  // Admin dashboard sections
  const adminSections = [
    {
      title: 'Polly Usage Statistics',
      description: 'Monitor AWS Polly character usage across users',
      href: '/admin/polly-usage',
      icon: <CloudIcon className="w-8 h-8 text-blue-500" />
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and roles',
      href: '/admin/users',
      icon: <UserIcon className="w-8 h-8 text-green-500" />
    },
    {
      title: 'Files Overview',
      description: 'View and manage uploaded files',
      href: '/admin/files',
      icon: <BookOpenIcon className="w-8 h-8 text-purple-500" />
    },
    {
      title: 'System Analytics',
      description: 'Detailed system performance and usage analytics',
      href: '/admin/analytics',
      icon: <ChartBarIcon className="w-8 h-8 text-red-500" />
    },
    {
      title: 'System Settings',
      description: 'Configure application-wide settings',
      href: '/admin/settings',
      icon: <CogIcon className="w-8 h-8 text-gray-500" />
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Total Users</h2>
          <p className="text-3xl font-bold">{overview.totalUsers}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Total Files</h2>
          <p className="text-3xl font-bold">{overview.totalFiles}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Polly Characters</h2>
          <p className="text-3xl font-bold">{overview.totalCharactersSynthesized.toLocaleString()}</p>
        </div>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <Link 
            key={section.title}
            href={section.href}
            className="block"
          >
            <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 flex items-center space-x-4">
              {section.icon}
              <div>
                <h3 className="text-xl font-semibold">{section.title}</h3>
                <p className="text-gray-600">{section.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}