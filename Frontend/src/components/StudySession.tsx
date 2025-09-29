import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Play,
  FileText,
  Video,
  Link,
  Brain,
  Target
} from 'lucide-react';
import dataService from '../services/dataService';
import { toast } from 'sonner';

interface StudySessionProps {
  studyPlanId: string;
  topicId: string;
  onClose: () => void;
  onComplete: () => void;
}

interface StudyContent {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: number;
  content: {
    overview: string;
    keyPoints: string[];
    examples: string[];
    exercises: string[];
  };
  resources: {
    type: 'video' | 'article' | 'book' | 'practice' | 'quiz';
    title: string;
    url?: string;
    description: string;
  }[];
}

const StudySession: React.FC<StudySessionProps> = ({
  studyPlanId,
  topicId,
  onClose,
  onComplete
}) => {
  const [content, setContent] = useState<StudyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [studyTime, setStudyTime] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadStudyContent();
    startStudySession();

    // Start study timer
    const timer = setInterval(() => {
      setStudyTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (sessionId) {
        endStudySession(false);
      }
      clearInterval(timer);
    };
  }, [studyPlanId, topicId]);

  const startStudySession = async () => {
    try {
      const response = await fetch('/api/study/progress/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studyPlanId,
          topicId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  };

  const endStudySession = async (completed: boolean) => {
    if (!sessionId) return;

    try {
      await fetch('/api/study/progress/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId,
          completed,
          studyTime,
          sectionsCompleted: Array.from(completedSections)
        })
      });
    } catch (error) {
      console.error('Error ending study session:', error);
    }
  };

  const loadStudyContent = async () => {
    try {
      // Load real AI-generated content from backend
      const response = await fetch(`/api/study/plans/${studyPlanId}/topics/${topicId}/content`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('StudySession: Loaded content:', data);
        const aiContent = data.content;

        setContent({
          title: aiContent.title || `Day ${topicId} Study Session`,
          description: aiContent.objectives?.join(', ') || 'Comprehensive learning material generated specifically for you',
          difficulty: 'adaptive',
          estimatedTime: aiContent.totalTime || 90,
          content: {
            overview: aiContent.content?.overview || 'Loading comprehensive overview...',
            keyPoints: aiContent.content?.keyPoints || [],
            examples: aiContent.content?.examples || [],
            exercises: aiContent.content?.exercises || []
          },
          resources: aiContent.resources || []
        });
      } else {
        throw new Error('Failed to load content');
      }
    } catch (error) {
      console.error('Error loading study content:', error);

      // Fallback to detailed placeholder content
      const mockContent: StudyContent = {
        title: 'Course Introduction',
        description: 'Overview and getting started with the course materials',
        difficulty: 'easy',
        estimatedTime: 90,
        content: {
          overview: `Welcome to this comprehensive study session! This topic will introduce you to the fundamental concepts and provide you with a solid foundation for your learning journey.

In this session, you'll learn about the core principles, understand key terminology, and see practical examples that will help you grasp the essential concepts.`,
          keyPoints: [
            'Understand the basic terminology and concepts',
            'Learn the fundamental principles and how they apply',
            'Explore real-world examples and use cases',
            'Practice with hands-on exercises',
            'Prepare for more advanced topics'
          ],
          examples: [
            'Example 1: Basic concept demonstration with step-by-step explanation',
            'Example 2: Practical application showing real-world usage',
            'Example 3: Common scenario and how to approach it',
            'Example 4: Problem-solving technique with detailed solution'
          ],
          exercises: [
            'Exercise 1: Complete the basic concept quiz (5 questions)',
            'Exercise 2: Apply the learned principles to a simple problem',
            'Exercise 3: Analyze a case study and identify key elements',
            'Exercise 4: Create your own example using the concepts learned'
          ]
        },
        resources: [
          {
            type: 'video',
            title: 'Introduction Video Tutorial',
            description: 'A comprehensive video explaining the core concepts with visual examples'
          },
          {
            type: 'article',
            title: 'Essential Reading Material',
            description: 'In-depth article covering the theoretical foundations'
          },
          {
            type: 'practice',
            title: 'Interactive Exercises',
            description: 'Hands-on practice problems to reinforce your learning'
          },
          {
            type: 'quiz',
            title: 'Knowledge Check Quiz',
            description: 'Test your understanding with a quick assessment'
          }
        ]
      };

      setContent(mockContent);
      toast.error('Failed to load study content');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sections = [
    { id: 0, title: 'Overview', icon: BookOpen },
    { id: 1, title: 'Key Points', icon: Target },
    { id: 2, title: 'Examples', icon: FileText },
    { id: 3, title: 'Exercises', icon: Brain },
    { id: 4, title: 'Resources', icon: Link }
  ];

  const markSectionComplete = async (sectionId: number) => {
    const sectionName = sections[sectionId]?.title || `Section ${sectionId}`;

    setCompletedSections(prev => new Set([...prev, sectionId]));

    // Track section completion
    if (sessionId) {
      try {
        await fetch('/api/study/progress/section', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            sessionId,
            sectionName,
            timeSpent: studyTime
          })
        });
      } catch (error) {
        console.error('Error tracking section completion:', error);
      }
    }
  };

  const handleCompleteStudy = async () => {
    try {
      await endStudySession(true);
      await onComplete();
      toast.success('Study session completed! Great job!');
      onClose();
    } catch (error) {
      toast.error('Failed to mark as complete');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading study content...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  const progress = (completedSections.size / sections.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-lg">{content.title}</CardTitle>
                <p className="text-sm text-gray-600">{content.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                {formatTime(studyTime)}
              </div>
              <Badge variant="outline">
                {content.difficulty}
              </Badge>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex">
            {/* Sidebar Navigation */}
            <div className="w-64 border-r bg-gray-50 p-4">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isCompleted = completedSections.has(section.id);
                  const isCurrent = currentSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isCurrent
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{section.title}</span>
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {currentSection === 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Overview</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {content.content.overview}
                    </p>
                  </div>
                  <Button
                    onClick={() => markSectionComplete(0)}
                    disabled={completedSections.has(0)}
                    className="mt-4"
                  >
                    {completedSections.has(0) ? 'Completed' : 'Mark as Read'}
                  </Button>
                </div>
              )}

              {currentSection === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Key Points</h3>
                  <ul className="space-y-3">
                    {content.content.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-gray-700">{point}</p>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => markSectionComplete(1)}
                    disabled={completedSections.has(1)}
                    className="mt-4"
                  >
                    {completedSections.has(1) ? 'Completed' : 'Mark as Understood'}
                  </Button>
                </div>
              )}

              {currentSection === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Examples</h3>
                  <div className="space-y-4">
                    {content.content.examples.map((example, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <p className="text-gray-700">{example}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    onClick={() => markSectionComplete(2)}
                    disabled={completedSections.has(2)}
                    className="mt-4"
                  >
                    {completedSections.has(2) ? 'Completed' : 'Mark as Reviewed'}
                  </Button>
                </div>
              )}

              {currentSection === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Practice Exercises</h3>
                  <div className="space-y-4">
                    {content.content.exercises.map((exercise, index) => (
                      <Card key={index} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <p className="text-gray-700 mb-3">{exercise}</p>
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-2" />
                            Start Exercise
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    onClick={() => markSectionComplete(3)}
                    disabled={completedSections.has(3)}
                    className="mt-4"
                  >
                    {completedSections.has(3) ? 'Completed' : 'Mark as Practiced'}
                  </Button>
                </div>
              )}

              {currentSection === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Additional Resources</h3>
                  <div className="grid gap-4">
                    {content.resources.map((resource, index) => {
                      const getIcon = () => {
                        switch (resource.type) {
                          case 'video': return <Video className="h-5 w-5" />;
                          case 'article': return <FileText className="h-5 w-5" />;
                          case 'book': return <BookOpen className="h-5 w-5" />;
                          case 'practice': return <Brain className="h-5 w-5" />;
                          case 'quiz': return <Target className="h-5 w-5" />;
                          default: return <Link className="h-5 w-5" />;
                        }
                      };

                      return (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                {getIcon()}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{resource.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                                <Button variant="outline" size="sm" className="mt-2">
                                  Access Resource
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => markSectionComplete(4)}
                    disabled={completedSections.has(4)}
                    className="mt-4"
                  >
                    {completedSections.has(4) ? 'Completed' : 'Mark as Explored'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <div className="border-t p-4 flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
              disabled={currentSection === sections.length - 1}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <Button
            onClick={handleCompleteStudy}
            disabled={completedSections.size < sections.length}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Study Session
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudySession;