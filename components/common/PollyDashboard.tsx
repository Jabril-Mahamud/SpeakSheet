import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Users,
  Volume2,
  Clock,
  Activity,
  Info,
} from "lucide-react";
import { getResetTimeString } from "@/utils/utils";
import { useTheme } from "next-themes";
import { CustomTooltipProps, PollyDashboardProps, UserUsageStats } from "@/utils/types";



const CustomBarTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">
        {payload[0].value.toLocaleString()} characters
      </p>
    </div>
  );
};

export const PollyDashboard: React.FC<PollyDashboardProps> = ({
  usageStats,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "daily" | "monthly" | "yearly"
  >("monthly");
  const { theme } = useTheme();

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get chart colors based on theme
  const getChartColors = () => {
    return {
      bar: theme === "dark" ? "#6366f1" : "#4f46e5",
      grid: theme === "dark" ? "#374151" : "#e5e7eb",
      text: theme === "dark" ? "#9ca3af" : "#4b5563",
    };
  };

  const chartColors = getChartColors();

  // Calculate aggregated stats
  const stats = usageStats.reduce(
    (acc, user) => {
      const period = user[selectedPeriod];
      return {
        totalCharacters: acc.totalCharacters + period.totalCharacters,
        limit: period.limit,
        quotaRemaining: acc.quotaRemaining + period.quotaRemaining,
        voiceDistribution: Object.entries(period.voiceDistribution).reduce(
          (voices, [voice, count]) => {
            voices[voice] = (voices[voice] || 0) + count;
            return voices;
          },
          acc.voiceDistribution
        ),
      };
    },
    {
      totalCharacters: 0,
      limit: usageStats[0]?.[selectedPeriod].limit || 0,
      quotaRemaining: 0,
      voiceDistribution: {} as Record<string, number>,
    }
  );

  // Calculate percentage used
  const percentageUsed = ((stats.totalCharacters / stats.limit) * 100).toFixed(
    1
  );
  const isApproachingLimit = parseFloat(percentageUsed) > 80;

  // Get top users with email obscuring
  const topUsers = [...usageStats]
    .sort(
      (a, b) =>
        b[selectedPeriod].totalCharacters - a[selectedPeriod].totalCharacters
    )
    .slice(0, 5)
    .map((user) => {
      const displayName =
        user.username || user.email?.split("@")[0] || user.userId;
      const obscuredName =
        displayName.length > 10
          ? `${displayName.slice(0, 10)}...`
          : displayName;

      return {
        displayName: obscuredName,
        fullName: user.username || displayName,
        email: user.email,
        characters: user[selectedPeriod].totalCharacters,
        percentage: (
          (user[selectedPeriod].totalCharacters / user[selectedPeriod].limit) *
          100
        ).toFixed(1),
      };
    });

  // Format voice distribution for chart
  const voiceUsageData = Object.entries(stats.voiceDistribution)
    .map(([voice, count]) => ({
      voice,
      characters: count,
      percentage: ((count / stats.totalCharacters) * 100).toFixed(1),
    }))
    .sort((a, b) => b.characters - a.characters);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AWS Polly Usage Dashboard</h1>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            {(["daily", "monthly", "yearly"] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "outline"}
                onClick={() => setSelectedPeriod(period)}
                className="capitalize"
              >
                {period}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {isApproachingLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}{" "}
            usage is approaching the limit! Currently at {percentageUsed}% of
            total capacity.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {stats.totalCharacters.toLocaleString()} /{" "}
                {stats.limit.toLocaleString()} characters
              </span>
              <span className="text-sm text-muted-foreground">
                {percentageUsed}%
              </span>
            </div>
            <Progress value={parseFloat(percentageUsed)} className="h-2" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {stats.quotaRemaining.toLocaleString()} characters remaining
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {usageStats.length} active users
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Resets in{" "}
                  {getResetTimeString(
                    usageStats[0]?.[selectedPeriod].resetTime
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUsers}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    dataKey="displayName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fill: chartColors.text }}
                  />
                  <YAxis tick={{ fill: chartColors.text }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <p className="font-medium">{data.fullName}</p>
                          {data.email && (
                            <p className="text-sm text-muted-foreground">
                              {data.email}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {data.characters.toLocaleString()} characters
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {data.percentage}% of limit
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="characters"
                    fill={chartColors.bar}
                    name="Characters Used"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Voice Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={voiceUsageData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    dataKey="voice"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fill: chartColors.text }}
                  />
                  <YAxis tick={{ fill: chartColors.text }} />
                  <RechartsTooltip content={CustomBarTooltip} />
                  <Bar
                    dataKey="characters"
                    fill={chartColors.bar}
                    name="Characters Synthesized"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {parseFloat(percentageUsed) > 80 && (
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                Consider implementing stricter user quotas to prevent limit
                exhaustion
              </li>
            )}
            {topUsers[0]?.percentage &&
              parseFloat(topUsers[0].percentage) > 30 && (
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  High usage concentration: top user accounts for{" "}
                  {topUsers[0].percentage}% of total usage
                </li>
              )}
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              {selectedPeriod} usage is at {percentageUsed}% of limit
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Next quota reset in{" "}
              {getResetTimeString(usageStats[0]?.[selectedPeriod].resetTime)}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
