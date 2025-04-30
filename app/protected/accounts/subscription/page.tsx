// app/protected/subscription/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import SubscriptionStatus from '@/components/Subscription/SubscriptionStatus';

export default function SubscriptionPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleSubscribe() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription</h1>
      
      <div className="mb-8">
        <SubscriptionStatus />
      </div>
      
      <div className="grid gap-8">
        <Card className="border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-medium rounded-bl-md">
            Popular Plan
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">SheetSpeak Premium</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">$10</span>
              <span className="text-muted-foreground"> / month</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Convert unlimited PDFs to high-quality audio</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Access to all premium voices (ElevenLabs, Amazon Polly, Neuphonic)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>1,000,000 characters per month (enough for ~500 pages)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Organize files in your audio library</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Cancel anytime</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subscribe Now
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}