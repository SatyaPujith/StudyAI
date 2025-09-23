import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import dataService from '../services/dataService';
import { toast } from 'sonner';

const UploadCard: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [level, setLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const generateStudyPlan = async () => {
    if (!level || !duration || !learningStyle) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (uploadedFiles.length === 0 && !manualInput.trim()) {
      toast.error('Please upload files or provide course description');
      return;
    }

    setIsGenerating(true);
    try {
      let studyPlan;

      if (uploadedFiles.length > 0) {
        // Upload files and generate study plan
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        formData.append('subject', manualInput.trim() || 'Uploaded Course');
        formData.append('level', level);
        formData.append('duration', duration);
        formData.append('learningStyle', learningStyle);

        const { uploadAPI } = await import('../lib/api');
        const response = await uploadAPI.uploadSyllabus(formData);
        studyPlan = response.data.studyPlan;
      } else {
        // Create study plan from manual input
        studyPlan = await dataService.createStudyPlan({
          subject: manualInput.trim(),
          level,
          duration,
          learningStyle,
          goals: ['exam_prep', 'skill_building']
        });
      }

      if (studyPlan) {
        toast.success('Study plan generated successfully!');
        // Reset form
        setUploadedFiles([]);
        setManualInput('');
        setLevel('');
        setDuration('');
        setLearningStyle('');
        
        // Wait a moment then refresh the page to show the new study plan
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to generate study plan');
      }
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast.error('Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-gray-100 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-50 pb-2">
        <CardTitle className="flex items-center gap-2 text-black">
          <div className="p-1 bg-white rounded-lg shadow-sm">
            <Sparkles className="h-4 w-4 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Create Your Study Plan</h3>
            <p className="text-xs text-gray-600 font-normal mt-0.5">
              Upload your syllabus or describe your learning goals
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3">
        {uploadedFiles.length === 0 ? (
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 group cursor-pointer",
              isDragOver 
                ? "border-gray-400 bg-gray-50 scale-[1.02]" 
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-25"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className={cn(
                "p-2 rounded-full transition-all duration-300",
                isDragOver ? "bg-gray-100" : "bg-gray-50 group-hover:bg-gray-100"
              )}>
                <Upload className={cn(
                  "h-5 w-5 transition-colors duration-300",
                  isDragOver ? "text-gray-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
              </div>
              
              <div className="space-y-2">
              <h4 className="font-medium text-gray-900">
                Drop your files here
              </h4>
              <p className="text-sm text-gray-500">
                or click to browse from your device
              </p>
              <p className="text-xs text-gray-400">
                Supports PDF, DOC, DOCX, TXT files
              </p>
              <div className="mt-2 text-center">
                <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-sm">
                  Choose files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            </div>
            </div>
            
            <Input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Uploaded Files</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploadedFiles([])}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                Clear all
              </Button>
            </div>
            
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="p-1.5 bg-white rounded-lg">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-7 w-7 hover:bg-gray-200 flex-shrink-0"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="pt-2">
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                id="add-more-files"
                onChange={handleFileInput}
              />
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                className="border-gray-200 hover:bg-gray-50 mr-2"
              >
                <label htmlFor="add-more-files" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Add More Files
                </label>
              </Button>
            </div>
          </div>
        )}
        
        {/* Manual Input Option */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or describe your course/subject:
              </label>
              <Textarea
                placeholder="e.g., Advanced Machine Learning, Data Structures and Algorithms, Organic Chemistry..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 day">1 day (Exam Prep)</SelectItem>
                    <SelectItem value="3 days">3 days</SelectItem>
                    <SelectItem value="7 days">1 week</SelectItem>
                    <SelectItem value="14 days">2 weeks</SelectItem>
                    <SelectItem value="30 days">1 month</SelectItem>
                    <SelectItem value="60 days">2 months</SelectItem>
                    <SelectItem value="90 days">3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Learning Style
                </label>
                <Select value={learningStyle} onValueChange={setLearningStyle}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select learning style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="auditory">Auditory</SelectItem>
                    <SelectItem value="reading">Reading/Writing</SelectItem>
                    <SelectItem value="kinesthetic">Kinesthetic (Hands-on)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-2 mt-2">
              <Button
                onClick={generateStudyPlan}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-1.5 text-sm"
                disabled={isGenerating || (!uploadedFiles.length && !manualInput.trim()) || !level || !duration || !learningStyle}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generating Study Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate AI Study Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadCard;