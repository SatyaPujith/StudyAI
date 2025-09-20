import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StudyTimeline from './StudyTimeline';
import UploadCard from './UploadCard';
import { BookOpen, RotateCcw, Settings, Upload } from 'lucide-react';
import dataService, { StudyPlan } from '../services/dataService';
import { toast } from 'sonner';

const StudyPlanView: React.FC = () => {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadStudyPlans();
  }, []);

  const loadStudyPlans = async () => {
    try {
      const plans = await dataService.getStudyPlans();
      setStudyPlans(plans);
    } catch (error) {
      console.error('Error loading study plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateStudyPlan = async () => {
    if (studyPlans.length === 0) return;

    const currentPlan = studyPlans[0];
    setRegenerating(true);

    try {
      const newPlan = await dataService.createStudyPlan({
        subject: currentPlan.subject,
        level: currentPlan.difficulty, // Use difficulty as level
        duration: `${currentPlan.estimatedDuration} days`, // Convert number to string with unit
        learningStyle: currentPlan.learningStyle || 'visual', // Provide default value
        goals: ['exam_prep', 'skill_building']
      });

      if (newPlan) {
        toast.success('Study plan regenerated successfully!');
        loadStudyPlans();
      } else {
        toast.error('Failed to regenerate study plan');
      }
    } catch (error) {
      console.error('Error regenerating study plan:', error);
      toast.error('Failed to regenerate study plan');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (studyPlans.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Your Study Plans
          </h2>
          <p className="text-gray-600 mt-1">
            Create personalized learning paths based on your goals
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Upload className="h-5 w-5" />
              Create Your First Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800 mb-6">
              Upload your syllabus or course materials to generate a personalized AI study plan.
            </p>
            <UploadCard />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = studyPlans[0]; // Get the most recent study plan

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Your Study Plans
          </h2>
          <p className="text-gray-600 mt-1">
            You have {studyPlans.length} active study plan{studyPlans.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </Button>
          <Button
            variant="outline"
            className="border-gray-200 hover:bg-gray-50"
            onClick={regenerateStudyPlan}
            disabled={regenerating}
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Create New Study Plan Section */}
      <Card className="border-green-200 bg-green-50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Upload className="h-5 w-5" />
            Create Another Study Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-800 mb-6">
            Upload additional course materials to create more study plans for different subjects.
          </p>
          <UploadCard />
        </CardContent>
      </Card>

      {/* Display all study plans */}
      {studyPlans.map((plan, index) => (
        <Card key={plan._id} className="border-gray-100 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-black">
              <BookOpen className="h-5 w-5" />
              {plan.title || plan.subject}
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                Level: {plan.difficulty}
              </span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                Duration: {plan.estimatedDuration} days
              </span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                Progress: {plan.progress?.percentage || 0}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <StudyTimeline studyPlanId={plan._id} />
          </CardContent>
        </Card>
      ))}


    </div>
  );
};

export default StudyPlanView;