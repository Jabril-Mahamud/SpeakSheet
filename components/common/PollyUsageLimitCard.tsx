'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

const MONTHLY_CHARACTER_LIMIT = 100000; // Adjust this value as needed

interface PollyUsageRecord {
  characters_synthesized: number;
}

interface UserSettings {
  api_key: string | null;
}

export const PollyUsageLimitCard = () => {
  const [currentUsage, setCurrentUsage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUsageData = async () => {
      const supabase = createClient();
      
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
        
        // Get current month's usage in UTC
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          1,
          0, 0, 0, 0
        ));
        
        // Fetch usage data
        const { data: usageData, error: usageError } = await supabase
          .from('polly_usage')
          .select('characters_synthesized')
          .eq('user_id', user.id)
          .gte('synthesis_date', startOfMonth.toISOString())
          .lt('synthesis_date', now.toISOString());
          
        if (usageError) throw usageError;
        
        // Check if user has custom credentials
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_tts_settings')
          .select('api_key')
          .single();
          
        if (settingsError) throw settingsError;
        
        // Calculate total usage
        const totalUsage = (usageData || []).reduce((sum, record: PollyUsageRecord) => 
          sum + (record.characters_synthesized || 0), 0);
          
        setCurrentUsage(totalUsage);
        setHasCustomCredentials(!!settingsData?.api_key);
        
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsageData();
  }, []);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load usage data: {error}</AlertDescription>
      </Alert>
    );
  }
  
  if (hasCustomCredentials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polly Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Using custom AWS credentials - no character limit applies
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Characters synthesized this month: {currentUsage.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const usagePercentage = (currentUsage / MONTHLY_CHARACTER_LIMIT) * 100;
  const remainingCharacters = Math.max(0, MONTHLY_CHARACTER_LIMIT - currentUsage);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Polly Usage Limit</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={usagePercentage} />
          <div className="flex justify-between text-sm">
            <span>
              Used: {currentUsage.toLocaleString()} characters
            </span>
            <span className="text-muted-foreground">
              Limit: {MONTHLY_CHARACTER_LIMIT.toLocaleString()} characters
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {remainingCharacters.toLocaleString()} characters remaining this month
          </p>
          {remainingCharacters === 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Monthly character limit reached. Add custom AWS credentials to continue using Polly.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
