'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Users, Volume2 } from 'lucide-react';
import { UserUsageStats } from '@/utils/polly-usage-tracker';

interface TopUser {
  email: string;
  characters: number;
}

interface VoiceUsage {
  voice: string;
  characters: number;
}

interface PollyDashboardProps {
  usageStats: UserUsageStats[];
}

const PollyDashboard: React.FC<PollyDashboardProps> = ({ usageStats }) => {
  const [dailyTotal, setDailyTotal] = useState<number>(0);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [yearlyTotal, setYearlyTotal] = useState<number>(0);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [usageByVoice, setUsageByVoice] = useState<VoiceUsage[]>([]);

  useEffect(() => {
    if (usageStats) {
      // Calculate totals
      const daily = usageStats.reduce((sum: number, user: UserUsageStats) => 
        sum + user.daily.totalCharacters, 0);
      const monthly = usageStats.reduce((sum: number, user: UserUsageStats) => 
        sum + user.monthly.totalCharacters, 0);
      const yearly = usageStats.reduce((sum: number, user: UserUsageStats) => 
        sum + user.yearly.totalCharacters, 0);
      
      setDailyTotal(daily);
      setMonthlyTotal(monthly);
      setYearlyTotal(yearly);

      // Calculate top users by monthly usage
      const usersByUsage: TopUser[] = [...usageStats]
        .sort((a, b) => b.monthly.totalCharacters - a.monthly.totalCharacters)
        .slice(0, 5)
        .map(user => ({
          email: user.email || user.userId,
          characters: user.monthly.totalCharacters
        }));
      setTopUsers(usersByUsage);

      // Aggregate voice usage across all users
      const voiceUsage: Record<string, number> = {};
      usageStats.forEach((user: UserUsageStats) => {
        Object.entries(user.monthly.voiceDistribution).forEach(([voice, count]) => {
          voiceUsage[voice] = (voiceUsage[voice] || 0) + count;
        });
      });

      setUsageByVoice(
        Object.entries(voiceUsage).map(([voice, count]) => ({
          voice,
          characters: count
        }))
      );
    }
  }, [usageStats]);

  const formatNumber = (num: number): string => new Intl.NumberFormat().format(num);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">AWS Polly Usage Dashboard</h1>

      {/* Usage Alerts */}
      {monthlyTotal > 800000 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Monthly usage is approaching the limit! Currently at {formatNumber(monthlyTotal)} characters.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dailyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatNumber(100000)} characters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(monthlyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatNumber(1000000)} characters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(yearlyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatNumber(5000000)} characters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="email" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="characters" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Voice Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageByVoice}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="voice" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="characters" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Recommendations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Daily usage is {dailyTotal < 80000 ? "within" : "approaching"} safe limits
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              Monthly usage is at {((monthlyTotal / 1000000) * 100).toFixed(1)}% of limit
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              Consider implementing user quotas if monthly usage exceeds 80%
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default PollyDashboard;