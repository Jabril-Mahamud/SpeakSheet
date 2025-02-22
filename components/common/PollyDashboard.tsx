'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PollyUsageData {
  user_id: string;
  characters_synthesized: number;
  voice_id: string;
  synthesis_date: string;
}

const PollyUsageStats: React.FC = () => {
  const [usageData, setUsageData] = useState<PollyUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPollyUsage = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/usage/polly');
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required. Please log in.');
          }
          throw new Error('Failed to fetch Polly usage data');
        }
        
        const data: PollyUsageData[] = await response.json();
        setUsageData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setUsageData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPollyUsage();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Polly Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">Loading usage data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Polly Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Polly Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {usageData.length === 0 ? (
          <p className="text-center text-gray-500">No Polly usage data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Synthesis Date</th>
                  <th className="border p-2 text-left">Voice ID</th>
                  <th className="border p-2 text-right">Characters Synthesized</th>
                </tr>
              </thead>
              <tbody>
                {usageData.map((usage, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border p-2">
                      {new Date(usage.synthesis_date).toLocaleDateString()}
                    </td>
                    <td className="border p-2">{usage.voice_id}</td>
                    <td className="border p-2 text-right">
                      {usage.characters_synthesized.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PollyUsageStats;