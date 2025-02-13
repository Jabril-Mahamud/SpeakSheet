"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  RefreshCw,
  Download,
  Users,
  FileText,
  Search,
  ChevronDown,
  Clock,
  Activity,
  Volume2,
  LucideIcon,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

// Types
interface UsageStats {
  totalUsers: number;
  dailyTotal: number;
  trends: Array<{
    date: string;
    characters: number;
  }>;
  users: Array<{
    id: string;
    username: string;
    email: string;
    isActive: boolean;
    charactersUsed: number;
    lastActive: string;
  }>;
}

interface FileStats {
  totalFiles: number;
  successRate: number;
  files: Array<{
    id: string;
    name: string;
    user: string;
    status: 'completed' | 'processing' | 'failed';
    createdAt: string;
    size: string;
  }>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [usageResponse, filesResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/files')
      ]);

      if (!usageResponse.ok || !filesResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const usageData = await usageResponse.json();
      const filesData = await filesResponse.json();

      setUsageStats(usageData);
      setFileStats(filesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/stats/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audioscribe-stats-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Statistics exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export statistics",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete file');

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getChartColors = () => ({
    primary: theme === 'dark' ? '#6366f1' : '#4f46e5',
    grid: theme === 'dark' ? '#374151' : '#e5e7eb',
    text: theme === 'dark' ? '#9ca3af' : '#4b5563'
  });

  const chartColors = getChartColors();

  const StatCard = ({ title, value, icon: Icon, subtext }: StatCardProps) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
            {subtext && (
              <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FileActionsDropdown = ({ file }: { file: FileStats['files'][0] }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => window.open(`/api/files/${file.id}/download`, '_blank')}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive"
          onClick={() => handleDeleteFile(file.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button 
            onClick={fetchDashboardData} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading dashboard data...
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={usageStats?.totalUsers || 0}
              icon={Users}
              subtext="Active accounts"
            />
            <StatCard
              title="Total Conversions"
              value={fileStats?.totalFiles || 0}
              icon={FileText}
              subtext="Processed files"
            />
            <StatCard
              title="Characters Today"
              value={usageStats?.dailyTotal?.toLocaleString() || 0}
              icon={Volume2}
              subtext="Characters processed"
            />
            <StatCard
              title="Success Rate"
              value={`${fileStats?.successRate || 0}%`}
              icon={Activity}
              subtext="Conversion success"
            />
          </div>

          {/* Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageStats?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: chartColors.text }}
                      stroke={chartColors.text}
                    />
                    <YAxis 
                      tick={{ fill: chartColors.text }}
                      stroke={chartColors.text}
                    />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="characters"
                      stroke={chartColors.primary}
                      name="Characters Processed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    className="pl-8"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Characters Used</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageStats?.users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${
                              user.isActive ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            {user.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </TableCell>
                        <TableCell>{user.charactersUsed.toLocaleString()}</TableCell>
                        <TableCell>{user.lastActive}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>File Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search files..." 
                    className="pl-8"
                  />
                </div>
                <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fileStats?.files?.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.user}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                            ${file.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              file.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                            {file.status}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{file.size}</TableCell>
                        <TableCell className="text-right">
                          <FileActionsDropdown file={file} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Progress value={fileStats?.successRate || 0} className="h-2" />
                    </div>
                    <span className="text-sm font-medium">{fileStats?.successRate || 0}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Average Processing Time</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">2.5 seconds</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Failed Conversions</p>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">{fileStats?.files?.filter(f => f.status === 'failed').length || 0} files</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}