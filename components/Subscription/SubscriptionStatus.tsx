// components/subscription/SubscriptionStatus.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';

type SubscriptionDetails = {
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscription/details');
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription details');
        }
        
        const data = await response.json();
        setSubscription(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  async function handleManageSubscription() {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to access billing portal');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription || subscription.status === 'canceled') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            You don't have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Subscribe to SheetSpeak Premium to unlock all features and convert PDFs to audio.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => window.location.href = '/protected/subscription'}>
            View Subscription Options
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Your Subscription</CardTitle>
          {subscription.status === 'active' && (
            <div className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium">
              Active
            </div>
          )}
          {subscription.status === 'past_due' && (
            <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
              Payment Issue
            </div>
          )}
        </div>
        <CardDescription>
          {subscription.plan} Plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {subscription.status === 'past_due' && (
          <Alert variant="destructive" className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment Issue</AlertTitle>
            <AlertDescription>
              We couldn't process your latest payment. Please update your payment method to maintain access.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{subscription.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Period Ends</span>
            <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-Renewal</span>
            <span className="font-medium">{subscription.cancelAtPeriodEnd ? 'Off' : 'On'}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleManageSubscription}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <CreditCard className="mr-2 h-4 w-4" />
          Manage Billing
        </Button>
      </CardFooter>
    </Card>
  );
}