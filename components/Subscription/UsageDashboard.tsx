// components/subscription/UsageDashboard.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, LineChart } from 'lucide-react';

export default function UsageDashboard() {
  const [usage, setUsage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 1000000; // 1 million characters
  
  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch('/api/usage');
        if (response.ok) {
          const data = await response.json();
          setUsage(data.characters);
        }
      } catch (error) {
        console.error('Failed to fetch usage data', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUsage();
  }, []);
  
  const percentage = usage ? Math.min(Math.round((usage / limit) * 100), 100) : 0;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Character Usage</CardTitle>
            <CardDescription>Your monthly character usage for TTS conversion</CardDescription>
          </div>
          <LineChart className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-sm">
            <span>{usage?.toLocaleString()} characters used</span>
            <span>{percentage}% of monthly limit</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your plan includes {limit.toLocaleString()} characters per month. Usage resets on the 1st of each month.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}