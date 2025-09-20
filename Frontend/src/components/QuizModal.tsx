import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizModalProps {
  open: boolean;
  onClose: () => void;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the time complexity of inserting an element at the beginning of an array?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correctAnswer: 2,
    explanation: "Inserting at the beginning requires shifting all existing elements to the right, which takes O(n) time."
  },
  {
    id: 2,
    question: "Which data structure follows the LIFO principle?",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correctAnswer: 1,
    explanation: "Stack follows Last In, First Out (LIFO) principle where the last element added is the first one to be removed."
  },
  {
    id: 3,
    question: "What is the space complexity of a binary search algorithm?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: 0,
    explanation: "Binary search uses a constant amount of extra space, regardless of input size, making it O(1) space complexity."
  }
];

const QuizModal: React.FC<QuizModalProps> = ({ open, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(sampleQuestions.length).fill(null));

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);

    if (selectedAnswer === sampleQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }

    setShowResult(true);
    
    setTimeout(() => {
      if (currentQuestion < sampleQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        // Quiz completed
        setTimeout(() => {
          handleRestart();
        }, 2000);
      }
    }, 2000);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers(new Array(sampleQuestions.length).fill(null));
  };

  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;
  const question = sampleQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-black">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-100 text-gray-700">AI</AvatarFallback>
            </Avatar>
            Quiz Practice Session
          </DialogTitle>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestion + 1} of {sampleQuestions.length}</span>
              <span>Score: {score}/{sampleQuestions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Tutor Message */}
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gray-100 text-gray-700">AI</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm p-4">
                <p className="text-gray-900 font-medium mb-3">{question.question}</p>
                
                <div className="space-y-2">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResult}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all duration-200",
                        selectedAnswer === index
                          ? showResult
                            ? index === question.correctAnswer
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-red-50 border-red-200 text-red-800"
                            : "bg-gray-100 border-gray-300 text-gray-900"
                          : showResult && index === question.correctAnswer
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option}</span>
                        {showResult && selectedAnswer === index && (
                          index === question.correctAnswer
                            ? <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />
                            : <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                        )}
                        {showResult && selectedAnswer !== index && index === question.correctAnswer && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Explanation */}
          {showResult && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gray-100 text-gray-700">AI</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={cn(
                      "font-medium",
                      isCorrect ? "text-green-800" : "text-red-800"
                    )}>
                      {isCorrect ? "Correct!" : "Not quite right."}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleRestart}
              className="border-gray-200 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
            
            <Button 
              onClick={selectedAnswer !== null ? handleNext : undefined}
              disabled={selectedAnswer === null}
              className="bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50"
            >
              {currentQuestion === sampleQuestions.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuizModal;