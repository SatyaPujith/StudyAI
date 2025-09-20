import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import dataService from '../services/dataService';
import StudySession from './StudySession';

interface StudyPlan {
  _id: string;
  title?: string;
  subject: string;
  difficulty: string;
  estimatedDuration: number;
  topics?: Array<{
    _id: string;
    title: string;
    description: string;
    status: string;
    estimatedTime: number;
  }>;
  dailyContent?: Array<{
    day: number;
    date: string;
    title: string;
    objectives: string[];
    content: {
      overview: string;
      keyPoints: string[];
      examples: string[];
      exercises: string[];
    };
    totalTime: number;
    status: string;
  }>;
  aiPrompt?: string;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  progress: number;
  estimatedTime: string;
  studyPlanId?: string;
  topicId?: string;
  date?: string;
}

interface StudyTimelineProps {
  preview?: boolean;
  studyPlanId?: string;
}

const StudyTimeline: React.FC<StudyTimelineProps> = ({ preview = false, studyPlanId }) => {
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [studySessionOpen, setStudySessionOpen] = useState<{
    studyPlanId: string;
    topicId: string;
  } | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, []);

  const loadStudyPlan = async () => {
    try {
      console.log('StudyTimeline: Loading study plan...');
      const studyPlans = await dataService.getStudyPlans();
      console.log('StudyTimeline: Received study plans:', studyPlans);

      if (studyPlans.length > 0) {
        const plan = studyPlans[0]; // Get the first/latest study plan
        console.log('StudyTimeline: Using plan:', plan);

        // Prioritize daily content if available
        if (plan.dailyContent && plan.dailyContent.length > 0) {
          console.log('StudyTimeline: Processing daily content:', plan.dailyContent);
          const items = plan.dailyContent.map((dayContent, index) => {
            const dayDate = dayContent.date ? new Date(dayContent.date) : new Date(Date.now() + (index * 24 * 60 * 60 * 1000));
            const today = new Date();
            const isToday = dayDate.toDateString() === today.toDateString();
            const isPast = dayDate < today;

            const getStatus = (): 'completed' | 'current' | 'upcoming' => {
              if (dayContent.status === 'completed') return 'completed';
              if (isToday || dayContent.status === 'in_progress') return 'current';
              if (isPast && index === 0) return 'current'; // First day is always current if past
              if (isPast) return 'upcoming'; // Don't auto-mark as current
              return 'upcoming';
            };

            // Create a proper description from objectives or content
            let description = 'Daily study session';
            if (dayContent.objectives && dayContent.objectives.length > 0) {
              description = dayContent.objectives.slice(0, 2).join(', ');
            } else if (dayContent.content && dayContent.content.overview) {
              description = dayContent.content.overview.substring(0, 100) + '...';
            }

            return {
              id: `day-${dayContent.day}`,
              title: dayContent.title || `Day ${dayContent.day}`,
              description,
              status: getStatus(),
              progress: dayContent.status === 'completed' ? 100 :
                dayContent.status === 'in_progress' ? 50 :
                  index === 0 ? 0 : 0, // Start with 0 progress
              estimatedTime: `${Math.ceil((dayContent.totalTime || 90) / 60)} hours`,
              studyPlanId: plan._id,
              topicId: dayContent.day.toString(),
              date: dayDate.toLocaleDateString()
            };
          });
          console.log('StudyTimeline: Created timeline items:', items);
          setTimelineData(items);
        }
        // Use the topics from the study plan if no daily content
        else if (plan.topics && plan.topics.length > 0) {
          const items = plan.topics.map((topic, index) => {
            const getTopicStatus = (): 'completed' | 'current' | 'upcoming' => {
              if (topic.status === 'completed') return 'completed';
              if (topic.status === 'in_progress') return 'current';
              return 'upcoming';
            };

            return {
              id: topic._id || `topic-${index}`,
              title: topic.title,
              description: topic.description || 'Study topic',
              status: getTopicStatus(),
              progress: topic.status === 'completed' ? 100 :
                topic.status === 'in_progress' ? 50 : 0,
              estimatedTime: `${Math.ceil(topic.estimatedTime / 60)} hours`,
              studyPlanId: plan._id,
              topicId: topic._id || `topic-${index}`
            };
          });
          setTimelineData(items);
        } else {
          // Fallback: Parse the AI-generated content
          const items = parseStudyPlanContent(plan.aiPrompt || plan.title || plan.subject, plan._id);
          setTimelineData(items);
        }
      }
    } catch (error) {
      console.error('Error loading study plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseStudyPlanContent = (content: string, planId: string): TimelineItem[] => {
    // This is a simplified parser - you'd want more sophisticated parsing
    // For now, we'll create some default items based on the content
    const lines = content.split('\n').filter(line => line.trim());
    const items: TimelineItem[] = [];

    // Look for numbered items or bullet points that could be timeline items
    lines.forEach((line, index) => {
      if (line.match(/^\d+\./) || line.match(/^[-*]/) || line.includes('Week') || line.includes('Chapter')) {
        items.push({
          id: `${planId}-${index}`,
          title: line.replace(/^\d+\.|\*|-/g, '').trim().substring(0, 50),
          description: `Study session ${index + 1} from your personalized plan`,
          status: index === 0 ? 'current' : 'upcoming',
          progress: index === 0 ? 25 : 0,
          estimatedTime: `${Math.floor(Math.random() * 3) + 2} hours`
        });
      }
    });

    // If no items found, create default structure
    if (items.length === 0) {
      items.push({
        id: `${planId}-default`,
        title: 'Getting Started',
        description: 'Begin your personalized study journey',
        status: 'current',
        progress: 0,
        estimatedTime: '2 hours'
      });
    }

    return items.slice(0, preview ? 3 : 10);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-4">
              <div className="w-5 h-5 bg-gray-200 rounded-full mt-1"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timelineData.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No study plan available. Upload your syllabus to get started!</p>
      </div>
    );
  }

  const items = preview ? timelineData.slice(0, 3) : timelineData;

  const startStudySession = (topicId: string) => {
    if (!studyPlanId) return;
    setStudySessionOpen({ studyPlanId, topicId });
  };

  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    if (!studyPlanId) return;

    setUpdating(topicId);
    try {
      // Call API to update topic status
      const response = await fetch(`/api/study/plans/${studyPlanId}/topics/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setTimelineData(prev => prev.map(item =>
          item.id === topicId
            ? {
              ...item,
              status: newStatus === 'completed' ? 'completed' :
                newStatus === 'in_progress' ? 'current' : 'upcoming',
              progress: newStatus === 'completed' ? 100 :
                newStatus === 'in_progress' ? 50 : 0
            }
            : item
        ));

        // Show success message
        const { toast } = await import('sonner');
        toast.success(`Topic marked as ${newStatus.replace('_', ' ')}`);
      }
    } catch (error) {
      console.error('Error updating topic status:', error);
      const { toast } = await import('sonner');
      toast.error('Failed to update topic status');
    } finally {
      setUpdating(null);
    }
  };

  const handleCompleteStudy = async () => {
    if (!studySessionOpen) return;
    await updateTopicStatus(studySessionOpen.topicId, 'completed');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'current':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'current':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div key={item.id} className="relative">
          {/* Timeline line */}
          {index < items.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
          )}

          <div className="flex gap-4">
            {/* Status icon */}
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(item.status)}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  {item.date && (
                    <p className="text-xs text-gray-500 mt-1">📅 {item.date}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", getStatusColor(item.status))}
                >
                  {item.estimatedTime}
                </Badge>
              </div>

              <p className="text-sm text-gray-600">{item.description}</p>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-gray-900 font-medium">{item.progress}%</span>
                </div>
                <Progress
                  value={item.progress}
                  className="h-2"
                />

                {/* Action buttons for non-preview mode */}
                {!preview && studyPlanId && (
                  <div className="flex gap-2 mt-3">
                    {item.status === 'upcoming' && (
                      <button
                        onClick={() => startStudySession(item.id)}
                        disabled={updating === item.id}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                      >
                        Start Study
                      </button>
                    )}
                    {item.status === 'current' && (
                      <>
                        <button
                          onClick={() => startStudySession(item.id)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Continue Study
                        </button>
                        <button
                          onClick={() => updateTopicStatus(item.id, 'completed')}
                          disabled={updating === item.id}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 disabled:opacity-50"
                        >
                          {updating === item.id ? 'Completing...' : 'Mark Complete'}
                        </button>
                      </>
                    )}
                    {item.status === 'completed' && (
                      <button
                        onClick={() => updateTopicStatus(item.id, 'in_progress')}
                        disabled={updating === item.id}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
                      >
                        {updating === item.id ? 'Reopening...' : 'Reopen'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Study Session Modal */}
      {studySessionOpen && (
        <StudySession
          studyPlanId={studySessionOpen.studyPlanId}
          topicId={studySessionOpen.topicId}
          onClose={() => setStudySessionOpen(null)}
          onComplete={handleCompleteStudy}
        />
      )}
    </div>
  );
};

export default StudyTimeline;