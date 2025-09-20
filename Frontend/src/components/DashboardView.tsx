import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UploadCard from './UploadCard';
import StudyTimeline from './StudyTimeline';
import dataService from '../services/dataService';
import { PlayCircle, TrendingUp, Clock, Target, BookOpen, Brain, Upload } from 'lucide-react';

interface DashboardViewProps {
  onStartQuiz: () => void;
}

interface UserStats {
  topicsCompleted: number;
  totalStudyTime: number;
  weeklyProgress: number;
  hasStudyPlan: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onStartQuiz }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    topicsCompleted: 0,
    totalStudyTime: 0,
    weeklyProgress: 0,
    hasStudyPlan: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      console.log('Loading user stats...');
      const studyPlans = await dataService.getStudyPlans();
      const quizAttempts = await dataService.getQuizAttempts();
      
      console.log('Study plans loaded:', studyPlans.length);
      console.log('Quiz attempts loaded:', quizAttempts.length);
      
      // Calculate stats from actual data
      const totalStudyTime = 0; // This would come from actual study session tracking
      const averageScore = quizAttempts.length > 0 
        ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length)
        : 0;
      const topicsCompleted = quizAttempts.filter(attempt => attempt.score >= 70).length; // Consider 70% as completed
      
      setStats({
        topicsCompleted,
        totalStudyTime,
        weeklyProgress: averageScore,
        hasStudyPlan: studyPlans.length > 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh data (can be called from child components)
  const refreshData = () => {
    setLoading(true);
    loadUserStats();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-black tracking-tight">
          Welcome back, {user?.firstName}!
        </h2>
        <p className="text-gray-600">
          {stats.hasStudyPlan 
            ? "Ready to continue your learning journey? Let's pick up where you left off."
            : "Get started by uploading your syllabus to create a personalized study plan."
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-xl">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Topics Completed</p>
                <p className="text-2xl font-bold text-black">{stats.topicsCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-xl">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Study Time</p>
                <p className="text-2xl font-bold text-black">{stats.totalStudyTime}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-xl">
                <TrendingUp className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-black">{Math.round(stats.weeklyProgress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Syllabus Section - Show if no study plan */}
      {!stats.hasStudyPlan && (
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Upload className="h-5 w-5" />
              Get Started with Your Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800 mb-4">
              Upload your syllabus or course materials to generate a personalized AI study plan.
            </p>
            <UploadCard />
          </CardContent>
        </Card>
      )}

      {/* Study Plan Section - Show if has study plan */}
      {stats.hasStudyPlan && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-black">
              <BookOpen className="h-5 w-5" />
              Your Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudyTimeline preview={true} />
          </CardContent>
        </Card>
      )}

      {/* Quick Quiz Practice - Only show if has study plan */}
      {stats.hasStudyPlan && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-black">
              <Brain className="h-5 w-5" />
              Quick Quiz Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Test your knowledge with AI-generated questions based on your study plan.
            </p>
            <Button 
              onClick={onStartQuiz}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Quiz Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardView;