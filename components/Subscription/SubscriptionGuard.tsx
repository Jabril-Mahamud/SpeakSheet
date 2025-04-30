// components/subscription/SubscriptionGuard.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSubscription() {
      try {
        const response = await fetch('/api/subscription/check');
        if (!response.ok) throw new Error('Failed to check subscription');
        
        const data = await response.json();
        setIsSubscribed(data.status === 'active' || data.status === 'trialing');
      } catch (error) {
        console.error('Failed to check subscription:', error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSubscribed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Premium Feature</CardTitle>
          </div>
          <CardDescription>
            This feature requires an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Subscribe to SheetSpeak Premium to unlock all features including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Convert unlimited PDFs to audio</li>
            <li>Access premium voices</li>
            <li>1,000,000 characters per month</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => window.location.href = '/protected/subscription'}>
            Subscribe Now
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <>{children}</>;
}