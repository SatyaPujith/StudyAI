import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface JoinQuizDialogProps {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
  joining: boolean;
}

const JoinQuizDialog: React.FC<JoinQuizDialogProps> = ({
  open,
  onClose,
  onJoin,
  joining
}) => {
  const [code, setCode] = React.useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onJoin(code);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Quiz by Code</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="joinCode">Enter Quiz Access Code</Label>
            <Input
              id="joinCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-character code"
              className="uppercase"
              maxLength={6}
              required
              autoFocus
            />
            <p className="text-sm text-gray-500">
              Enter the 6-character code provided by the quiz creator
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={joining}>
              Cancel
            </Button>
            <Button type="submit" disabled={joining || !code.trim()}>
              {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {joining ? 'Joining...' : 'Join Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinQuizDialog;