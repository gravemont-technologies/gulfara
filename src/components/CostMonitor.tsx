import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Zap, AlertTriangle } from 'lucide-react';
import { costOptimizer } from '@/services/costOptimizer';

interface CostMonitorProps {
  userId: string;
  className?: string;
}

export default function CostMonitor({ userId, className }: CostMonitorProps) {
  const [usageStats, setUsageStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    remainingTokens: 500,
    canMakeRequest: true
  });

  useEffect(() => {
    const stats = costOptimizer.getUsageStats(userId);
    setUsageStats(stats);
  }, [userId]);

  const getCostColor = (cost: number) => {
    if (cost < 0.005) return 'text-green-600';
    if (cost < 0.008) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTokenColor = (remaining: number) => {
    if (remaining > 200) return 'text-green-600';
    if (remaining > 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <span>AI Usage & Cost</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Cost</span>
          <span className={`text-lg font-bold ${getCostColor(usageStats.totalCost)}`}>
            ${usageStats.totalCost.toFixed(4)}
          </span>
        </div>

        {/* Cost Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Cost Limit</span>
            <span>$0.01</span>
          </div>
          <Progress 
            value={(usageStats.totalCost / 0.01) * 100} 
            className="h-2"
          />
        </div>

        {/* Token Usage */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Tokens Used</span>
          <span className={`text-sm font-medium ${getTokenColor(usageStats.remainingTokens)}`}>
            {usageStats.totalTokens}/500
          </span>
        </div>

        {/* Remaining Tokens */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Remaining</span>
            <span>{usageStats.remainingTokens} tokens</span>
          </div>
          <Progress 
            value={(usageStats.remainingTokens / 500) * 100} 
            className="h-2"
          />
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center">
          {usageStats.canMakeRequest ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Zap className="w-3 h-3 mr-1" />
              AI Available
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Limit Reached
            </Badge>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>GPT-5 Nano:</span>
            <span>${(usageStats.totalCost * 0.6).toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span>GPT-5 Mini:</span>
            <span>${(usageStats.totalCost * 0.4).toFixed(4)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
