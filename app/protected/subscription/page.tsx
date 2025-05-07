// app/protected/subscription/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Zap, 
  Calendar, 
  BadgeCheck,
  Lock, 
  Check,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SubscriptionTier {
  id: number;
  name: string;
  monthly_price: number;
  character_limit: number;
  description: string;
  features: {
    standard_voices: boolean;
    neural_voices: boolean;
    premium_voices: boolean;
  };
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  subscription_tiers: SubscriptionTier;
}

interface UsageData {
  current: number;
  limit: number;
  remaining: number;
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [processingTier, setProcessingTier] = useState<number | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for success/canceled params
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  
  useEffect(() => {
    if (success) {
      toast({
        title: "Subscription successful",
        description: "Your subscription has been successfully processed.",
        variant: "default",
      });
    } else if (canceled) {
      toast({
        title: "Subscription canceled",
        description: "Your subscription process was canceled.",
        variant: "destructive",
      });
    }
  }, [success, canceled]);
  
  // Fetch subscription data
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscriptions');
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription data');
        }
        
        const data = await response.json();
        
        setSubscription(data.subscription);
        if (data.tiers) {
          setTiers(data.tiers);
        }
        setUsage(data.usage);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setError('Failed to load subscription information. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSubscription();
  }, []);
  
  // Format price from cents to dollars
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate usage percentage
  const getUsagePercentage = () => {
    if (!usage || usage.limit === 0) return 0;
    return Math.min(100, Math.round((usage.current / usage.limit) * 100));
  };
  
  // Handle subscription checkout
  const handleSubscribe = async (tierId: number) => {
    setProcessingTier(tierId);
    
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tierId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { checkoutUrl } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : 'Failed to start checkout process',
        variant: "destructive",
      });
    } finally {
      setProcessingTier(null);
    }
  };
  
  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    // This would typically show a confirmation dialog first
    if (!confirm("Are you sure you want to cancel your subscription? You'll still have access until the end of your billing period.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/subscriptions/${subscription?.id}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }
      
      // Refresh the subscription data
      router.refresh();
      
      toast({
        title: "Subscription canceled",
        description: "Your subscription has been canceled and will end at the current billing period.",
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : 'Failed to cancel subscription',
        variant: "destructive",
      });
    }
  };
  
  if (loading) {
    return (
      <div className="container max-w-5xl py-10 px-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-medium">Loading subscription information...</h3>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-5xl py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button onClick={() => router.refresh()}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl py-10 px-4">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Subscription & Usage
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription plan and monitor your usage
        </p>
      </div>
      
      {/* Usage Card */}
      <Card className="mb-8 border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Usage Overview</CardTitle>
          <CardDescription>
            Your current usage and remaining quota for this billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">
                {usage?.current.toLocaleString()} / {usage?.limit.toLocaleString()} characters used
              </span>
              <span className="text-sm font-medium">
                {getUsagePercentage()}%
              </span>
            </div>
            <Progress value={getUsagePercentage()} className="h-3" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-secondary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Current Plan</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {subscription?.subscription_tiers.name || 'Free'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Next Billing Date</span>
                </div>
                <p className="text-xl font-bold mt-2">
                  {subscription?.current_period_end ? 
                    formatDate(subscription.current_period_end) : 
                    'N/A'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Remaining Characters</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {usage?.remaining.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {usage && usage.current > usage.limit * 0.8 && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Almost at your limit!</AlertTitle>
              <AlertDescription>
                You've used {getUsagePercentage()}% of your monthly character limit. 
                Consider upgrading your plan for additional characters.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Current Subscription Card */}
      {subscription && (
        <Card className="mb-8 border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Current Subscription</CardTitle>
              <Badge 
                variant={
                  subscription.status === 'active' ? 'default' : 
                  subscription.status === 'past_due' ? 'destructive' : 
                  'secondary'
                }
              >
                {subscription.status === 'active' ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Active</span>
                  </div>
                ) : subscription.status === 'past_due' ? (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Past Due</span>
                  </div>
                ) : (
                  subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
                )}
              </Badge>
            </div>
            <CardDescription>
              {subscription.subscription_tiers.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Plan Details</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatPrice(subscription.subscription_tiers.monthly_price)} / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {subscription.subscription_tiers.character_limit.toLocaleString()} characters / month
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Current period: {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Available Features</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-1 text-green-500" />
                    <span className="text-sm">Standard voices</span>
                  </li>
                  {subscription.subscription_tiers.features.neural_voices && (
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-1 text-green-500" />
                      <span className="text-sm">Neural voices</span>
                    </li>
                  )}
                  {subscription.subscription_tiers.features.premium_voices && (
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-1 text-green-500" />
                      <span className="text-sm">Premium voices</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            {subscription.cancel_at_period_end ? (
              <div className="w-full">
                <Alert variant="default" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Subscription ending</AlertTitle>
                  <AlertDescription>
                    Your subscription will end on {formatDate(subscription.current_period_end)}.
                    You can renew anytime before then to keep your benefits.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={() => {/* Implement renewal logic */}}>
                  Renew Subscription
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:bg-destructive/10" 
                onClick={handleCancelSubscription}
              >
                Cancel Subscription
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
      
      {/* Available Plans Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(tiers.length > 0 ? tiers : [
              {
                id: 1,
                name: 'Free',
                monthly_price: 0,
                character_limit: 1000,
                description: 'Basic text-to-speech with limited characters and standard voices only',
                features: { standard_voices: true, neural_voices: false, premium_voices: false }
              },
              {
                id: 2,
                name: 'Basic',
                monthly_price: 699,
                character_limit: 60000,
                description: 'Enhanced text-to-speech with more characters and neural voices',
                features: { standard_voices: true, neural_voices: true, premium_voices: false }
              },
              {
                id: 3,
                name: 'Premium',
                monthly_price: 1999,
                character_limit: 200000,
                description: 'Premium text-to-speech with maximum characters and all voice types',
                features: { standard_voices: true, neural_voices: true, premium_voices: true }
              }
            ]).map((tier) => (
              <Card 
                key={tier.id}
                className={`border ${
                  subscription?.subscription_tiers.id === tier.id 
                    ? 'border-primary border-2' 
                    : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{tier.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {formatPrice(tier.monthly_price)}{tier.monthly_price > 0 ? '/month' : ''}
                      </CardDescription>
                    </div>
                    {subscription?.subscription_tiers.id === tier.id && (
                      <Badge variant="outline" className="bg-primary/10">Current</Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    {tier.description}
                  </p>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {tier.character_limit.toLocaleString()} characters / month
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Standard voices</span>
                    </div>
                    
                    {tier.features.neural_voices ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Neural voices</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Neural voices</span>
                      </div>
                    )}
                    
                    {tier.features.premium_voices ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Premium voices</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Premium voices</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter>
                  {subscription?.subscription_tiers.id === tier.id ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : processingTier === tier.id ? (
                    <Button disabled className="w-full">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </Button>
                  ) : (
                    <Button 
                      variant={tier.monthly_price > 0 ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleSubscribe(tier.id)}
                    >
                      {tier.monthly_price > 0 ? (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Subscribe
                        </>
                      ) : 'Select Free Plan'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}