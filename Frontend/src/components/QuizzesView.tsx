import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Brain, Trophy, Clock, ChevronRight, Plus, Search } from 'lucide-react';
import dataService from '../services/dataService';
import { toast } from 'sonner';
import QuizCreationDialog from './QuizCreationDialog';
import JoinQuizDialog from './JoinQuizDialog';
import ManualQuizBuilder from './ManualQuizBuilder';

interface QuizzesViewProps {
  onStartQuiz: (quizId: string) => void;
}

interface Quiz {
  _id: string;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: any[];
  createdAt: string;
  isPublic: boolean;
  accessCode?: string;
}

interface QuizAttempt {
  _id: string;
  quizId: string;
  score: number;
  completedAt: string;
}

const QuizzesView: React.FC<QuizzesViewProps> = ({ onStartQuiz }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newQuizTopic, setNewQuizTopic] = useState('');
  const [newQuizDifficulty, setNewQuizDifficulty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreationDialog, setShowCreationDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    loadQuizzes();
    loadAttempts();
  }, []);

  const loadQuizzes = async () => {
    try {
      const data = await dataService.getQuizzes();
      setQuizzes(data as Quiz[]);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttempts = async () => {
    try {
      const data = await dataService.getQuizAttempts();
      setAttempts(data);
    } catch (error) {
      console.error('Error loading quiz attempts:', error);
    }
  };

  const createQuiz = async (useAI: boolean = true, isPublic: boolean = true) => {
    if (!newQuizTopic.trim() || !newQuizDifficulty) {
      toast.error('Please provide topic and difficulty');
      return;
    }

    setCreating(true);
    try {
      if (useAI) {
        // AI-generated quiz
        const quiz = await dataService.createQuiz({
          topic: newQuizTopic,
          difficulty: newQuizDifficulty,
          questionCount: 10,
          isPublic
        });
        
        if (quiz) {
          toast.success('Quiz created successfully!');
          
          // Show access code for private quizzes
          if (!isPublic && quiz.accessCode) {
            toast.success(
              `Your private quiz access code: ${quiz.accessCode}`,
              { duration: 10000 }
            );
          }
          
          setNewQuizTopic('');
          setNewQuizDifficulty('');
          setShowCreationDialog(false);
          loadQuizzes();
        } else {
          toast.error('Failed to create quiz');
        }
      } else {
        // Manual quiz creation - show manual quiz builder
        setShowCreationDialog(false);
        setShowManualBuilder(true);
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  const showQuizCreationOptions = () => {
    if (!newQuizTopic.trim() || !newQuizDifficulty) {
      toast.error('Please provide topic and difficulty first');
      return;
    }

    setShowCreationDialog(true);
  };
  
  const joinQuizByCode = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    
    try {
      const result = await dataService.joinQuizByCode(joinCode);
      if (result && result.success) {
        toast.success('Successfully joined quiz!');
        setJoinCode('');
        setShowJoinDialog(false);
        loadQuizzes();
      } else {
        toast.error('Invalid access code or quiz not found');
      }
    } catch (error) {
      console.error('Error joining quiz:', error);
      toast.error('Failed to join quiz');
    }
  };

  const getQuizScore = (quizId: string) => {
    const attempt = attempts.find(a => a.quizId === quizId);
    return attempt ? Math.round(attempt.score) : null;
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'medium':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'hard':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-black tracking-tight">
          Quiz Practice
        </h2>
        <p className="text-gray-600">
          Test your knowledge with AI-generated questions tailored to your learning progress.
        </p>
      </div>

      {/* Create New Quiz */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Quiz topic (e.g., React Hooks)"
              value={newQuizTopic}
              onChange={(e) => setNewQuizTopic(e.target.value)}
            />
            <Select value={newQuizDifficulty} onValueChange={setNewQuizDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                onClick={showQuizCreationOptions}
                disabled={creating || !newQuizTopic.trim() || !newQuizDifficulty}
                className="bg-gray-900 hover:bg-gray-800 flex-1"
              >
                {creating ? 'Creating...' : 'Create Quiz'}
              </Button>
              <Button
                onClick={() => setShowJoinDialog(true)}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
              >
                Join
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showCreationDialog && (
        <QuizCreationDialog
          open={showCreationDialog}
          onClose={() => setShowCreationDialog(false)}
          topic={newQuizTopic}
          difficulty={newQuizDifficulty}
          onCreateQuiz={createQuiz}
          creating={creating}
        />
      )}
      
      {showJoinDialog && (
        <JoinQuizDialog
          open={showJoinDialog}
          onClose={() => setShowJoinDialog(false)}
          onJoin={(code) => {
            setJoinCode(code);
            return joinQuizByCode();
          }}
          joining={false}
        />
      )}
      
      {showManualBuilder && (
        <ManualQuizBuilder
          topic={newQuizTopic}
          difficulty={newQuizDifficulty}
          isPublic={true}
          onBack={() => setShowManualBuilder(false)}
          onClose={() => setShowManualBuilder(false)}
          onSave={handleManualQuizSave}
        />
      )}
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search quizzes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quiz List */}
      <div className="space-y-4">
        {filteredQuizzes.length === 0 ? (
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-8 text-center">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {quizzes.length === 0
                  ? "No quizzes available. Create your first quiz above!"
                  : "No quizzes match your search."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuizzes.map((quiz) => {
            const score = getQuizScore(quiz._id);
            const hasAttempted = score !== null;

            return (
              <Card key={quiz._id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-black">{quiz.title}</h3>
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(quiz.difficulty)}
                        >
                          {quiz.difficulty}
                        </Badge>
                        {hasAttempted && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Trophy className="h-3 w-3 mr-1" />
                            {score}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Topic: {quiz.topic}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Brain className="h-4 w-4" />
                          {quiz.questions.length} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          ~{Math.ceil(quiz.questions.length * 1.5)} min
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => onStartQuiz(quiz._id)}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {hasAttempted ? 'Retake' : 'Start'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
  
  // Add the handleManualQuizSave function inside the component
  async function handleManualQuizSave(quizData: any) {
    try {
      console.log('Creating manual quiz with data:', quizData);
      const quiz = await dataService.createManualQuiz(quizData);
      
      if (quiz) {
        toast.success('Quiz created successfully!');
        
        // Show access code for private quizzes
        if (!quizData.isPublic && quiz.accessCode) {
          toast.success(
            `Your private quiz access code: ${quiz.accessCode}`,
            { duration: 10000 }
          );
        }
        
        setNewQuizTopic('');
        setNewQuizDifficulty('');
        setShowManualBuilder(false);
        loadQuizzes();
      } else {
        toast.error('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating manual quiz:', error);
      toast.error('Failed to create quiz');
    }
  }
};

export default QuizzesView;
