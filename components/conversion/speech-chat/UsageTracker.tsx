"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { PollyUsageClient } from "@/utils/polly-usage-client";

export function UsageTracker({ onLimitsExceeded }: { onLimitsExceeded?: (exceeded: boolean) => void }) {
  const [usageData, setUsageData] = useState<{
    allowed: boolean;
    currentUsage: number;
    remainingCharacters: number;
    monthlyLimit: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Authentication required");
        }
        
        // Check if user has custom credentials
        const { data: settings } = await supabase
          .from('user_tts_settings')
          .select('api_key')
          .eq('id', user.id)
          .single();
          
        if (settings?.api_key) {
          setHasCustomCredentials(true);
          setIsLoading(false);
          return;
        }
        
        // Get current usage
        const usageLimits = await PollyUsageClient.checkUsageLimits(user.id);
        setUsageData(usageLimits);
        
        // Notify parent component if limits are exceeded
        if (onLimitsExceeded && !usageLimits.allowed) {
          onLimitsExceeded(true);
        }
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsageData();
  }, [supabase, onLimitsExceeded]);
  
  if (isLoading) {
    return null;
  }
  
  if (error) {
    return null;
  }
  
  if (hasCustomCredentials) {
    return (
      <Alert className="mb-4 bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Using custom AWS credentials - no character limit applies
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!usageData) {
    return null;
  }
  
  const usagePercentage = Math.min(100, (usageData.currentUsage / usageData.monthlyLimit) * 100);
  const isApproachingLimit = usagePercentage >= 80 && usagePercentage < 100;
  const isOverLimit = !usageData.allowed || usageData.remainingCharacters <= 0;
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Info className="h-4 w-4 mr-2 text-blue-600" />
          Speech Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="relative w-full">
            <Progress 
              value={usagePercentage} 
              className={cn(
                "h-2",
                isOverLimit ? "bg-destructive/20" : isApproachingLimit ? "bg-yellow-200" : ""
              )}
            />
            {isOverLimit && (
              <div className="absolute inset-0 bg-destructive" style={{ width: '100%', height: '100%' }} />
            )}
            {isApproachingLimit && (
              <div className="absolute inset-0 bg-yellow-500/50" style={{ width: `${usagePercentage}%`, height: '100%' }} />
            )}
          </div>
          
          <div className="flex justify-between text-sm">
            <span className={cn(isOverLimit && "text-destructive font-medium")}>
              Used: {usageData.currentUsage.toLocaleString()} characters
            </span>
            <span className="text-muted-foreground">
              Limit: {usageData.monthlyLimit.toLocaleString()} characters
            </span>
          </div>
          
          {!isOverLimit ? (
            <p className="text-sm text-muted-foreground">
              {usageData.remainingCharacters.toLocaleString()} characters remaining this month
            </p>
          ) : (
            <Alert variant="destructive" className="mt-2 py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Usage Limit Exceeded</AlertTitle>
              <AlertDescription className="text-xs">
                Add custom AWS credentials in settings to continue using text-to-speech.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}