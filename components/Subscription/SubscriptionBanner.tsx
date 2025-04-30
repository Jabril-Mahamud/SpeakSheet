// components/subscription/SubscriptionBanner.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;

export default function SubscriptionBanner() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      try {
        const response = await fetch('/api/subscription/check');
        if (!response.ok) throw new Error('Failed to fetch subscription');
        
        const data = await response.json();
        setSubscriptionStatus(data.status || null);
      } catch (error) {
        console.error('Failed to check subscription:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, []);

  async function handleSubscribe() {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to create subscription');
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleManageSubscription() {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to access billing portal');
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5 mb-8">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // For active subscriptions, show a different message
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800/30 mb-8">
        <CardContent className="py-4 flex justify-between items-center">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span>You have an active subscription. Enjoy all premium features!</span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleManageSubscription}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Manage Subscription
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For past due subscriptions
  if (subscriptionStatus === 'past_due') {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800/30 mb-8">
        <CardContent className="py-4">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="font-medium">Your subscription payment has failed</span>
          </div>
          <p className="text-sm mb-4">
            Please update your payment method to continue using premium features.
          </p>
          <Button 
            onClick={handleManageSubscription}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Update Payment Method
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For canceled or no subscription
  return (
    <Card className="border-primary/20 bg-primary/5 mb-8">
      <CardHeader>
        <CardTitle>Unlock Premium Features</CardTitle>
        <CardDescription>
          Subscribe to SheetSpeak for just $10/month to unlock unlimited PDF to audio conversions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside space-y-2">
          <li>Convert unlimited PDFs to natural-sounding audio</li>
          <li>Access premium voices from ElevenLabs, Amazon Polly, and Neuphonic</li>
          <li>Organize your audio files in a personal library</li>
          <li>1,000,000 characters per month included</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubscribe} 
          className="w-full"
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Subscribe Now - $10/month
        </Button>
      </CardFooter>
    </Card>
  );
}