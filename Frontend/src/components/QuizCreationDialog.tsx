import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface QuizCreationDialogProps {
  open: boolean;
  onClose: () => void;
  topic: string;
  difficulty: string;
  onCreateQuiz: (useAI: boolean, isPublic: boolean) => Promise<void>;
  creating: boolean;
}

const QuizCreationDialog: React.FC<QuizCreationDialogProps> = ({
  open,
  onClose,
  topic,
  difficulty,
  onCreateQuiz,
  creating
}) => {
  const [useAI, setUseAI] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = async () => {
    await onCreateQuiz(useAI, isPublic);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Quiz: {topic}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Generation Method</h3>
            <RadioGroup defaultValue="ai" onValueChange={(value) => setUseAI(value === 'ai')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ai" id="ai" />
                <Label htmlFor="ai" className="cursor-pointer">AI Generation (recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="cursor-pointer">Manual Creation</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Quiz Privacy</h3>
            <RadioGroup defaultValue="public" onValueChange={(value) => setIsPublic(value === 'public')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer">Public Quiz (visible to everyone)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer">Private Quiz (accessible via code only)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating ? 'Creating...' : 'Create Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuizCreationDialog;