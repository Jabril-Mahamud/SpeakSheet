// app/protected/account/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionStatus from '@/components/Subscription/SubscriptionStatus';
import UsageDashboard from '@/components/Subscription/UsageDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect('/sign-in');
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Your Account</h1>
      
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Account ID</p>
                <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <SubscriptionStatus />
        
        <UsageDashboard />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild variant="outline">
            <Link href="/protected/library">View My Library</Link>
          </Button>
          <Button asChild>
            <Link href="/protected/convert">Convert New PDF</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}