import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Video, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

const RightPanel: React.FC = () => {
  return (
    <aside className="w-full xl:w-80 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Study Group */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-black text-lg">
            <Users className="h-5 w-5" />
            Active Study Group
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">DS & Algorithms</span>
              <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                Live
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['AM', 'JS', 'MK'].map((member, idx) => (
                  <Avatar key={idx} className="h-7 w-7 border-2 border-white">
                    <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                      {member}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm text-gray-600">+5 others</span>
            </div>
            
            <Button 
              size="sm" 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Video className="h-4 w-4 mr-2" />
              Join Session
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-black text-lg">
            <TrendingUp className="h-5 w-5" />
            Progress Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-sm font-semibold text-gray-900">78%</span>
            </div>
            <Progress value={78} className="h-2" />
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Topics Completed</p>
                <p className="text-xs text-gray-600">24 of 32</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Study Streak</p>
                <p className="text-xs text-gray-600">12 days</p>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Next Task</p>
              <p className="text-xs text-gray-600 mt-1">
                Complete Stack Operations Quiz
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-black text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start border-gray-200 hover:bg-gray-50"
          >
            Schedule Study Session
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start border-gray-200 hover:bg-gray-50"
          >
            Review Weak Topics
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start border-gray-200 hover:bg-gray-50"
          >
            Export Study Notes
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
};

export default RightPanel;