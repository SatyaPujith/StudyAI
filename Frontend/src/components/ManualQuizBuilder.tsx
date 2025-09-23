import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import dataService from '../services/dataService';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface ManualQuizBuilderProps {
  topic: string;
  difficulty: string;
  isPublic?: boolean;
  onClose: () => void;
  onSave: (quizData: any) => Promise<void>;
  onBack: () => void;
}

const ManualQuizBuilder: React.FC<ManualQuizBuilderProps> = ({
  topic: initialTopic,
  difficulty: initialDifficulty,
  isPublic: initialIsPublic = true,
  onClose,
  onSave,
  onBack
}) => {
  const [title, setTitle] = useState(`${initialTopic} - ${initialDifficulty} Quiz`);
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correct: 0,
      explanation: ''
    }
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now().toString(),
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        explanation: ''
      }
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) {
      toast.error('Quiz must have at least one question');
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      toast.error('Quiz title is required');
      return false;
    }

    if (!topic.trim()) {
      toast.error('Quiz topic is required');
      return false;
    }

    if (!difficulty) {
      toast.error('Quiz difficulty is required');
      return false;
    }

    for (const q of questions) {
      if (!q.question.trim()) {
        toast.error('All questions must have content');
        return false;
      }

      for (const option of q.options) {
        if (!option.trim()) {
          toast.error('All options must have content');
          return false;
        }
      }

      if (!q.explanation.trim()) {
        toast.error('All questions must have explanations');
        return false;
      }
    }

    return true;
  };

  const saveQuiz = async () => {
    if (!validateQuiz()) return;

    setSaving(true);
    try {
      const formattedQuestions = questions.map(q => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }));

      const quiz = await dataService.createManualQuiz({
        title,
        topic,
        difficulty,
        questions: formattedQuestions,
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
        
        onBack();
      } else {
        toast.error('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Button>
        <Button onClick={saveQuiz} disabled={saving} className="gap-1">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter quiz topic"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 h-full pt-8">
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="isPublic">Public Quiz (visible to everyone)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
          <Button onClick={addQuestion} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>

        {questions.map((question, qIndex) => (
          <Card key={question.id} className="border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`question-${question.id}`}>Question</Label>
                <Textarea
                  id={`question-${question.id}`}
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                  placeholder="Enter your question"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-3">
                <Label>Options</Label>
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6">
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correct === index}
                        onChange={() => updateQuestion(question.id, 'correct', index)}
                        className="w-4 h-4"
                      />
                    </div>
                    <Input
                      value={option}
                      onChange={(e) => updateOption(question.id, index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-1">
                  Select the radio button next to the correct answer
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`explanation-${question.id}`}>Explanation</Label>
                <Textarea
                  id={`explanation-${question.id}`}
                  value={question.explanation}
                  onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                  placeholder="Explain why the correct answer is right"
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={saveQuiz} disabled={saving}>
          {saving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>
    </div>
  );
};

export default ManualQuizBuilder;