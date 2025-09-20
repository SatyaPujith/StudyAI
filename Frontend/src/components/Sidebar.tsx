import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  Brain, 
  Users,
  X
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'study-plan', label: 'Study Plan', icon: BookOpen },
  { id: 'quizzes', label: 'Quizzes', icon: Brain },
  { id: 'study-groups', label: 'Study Groups', icon: Users },
];

const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  onClose, 
  activeSection, 
  onSectionChange 
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-100 transform transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-semibold text-gray-900">Menu</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-gray-50"
          >
            <X className="h-5 w-5 text-gray-700" />
          </Button>
        </div>
        
        <ScrollArea className="px-4 py-2">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2.5 h-auto font-medium text-sm",
                    isActive 
                      ? "bg-gray-50 text-black border border-gray-200" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => {
                    onSectionChange(item.id);
                    onClose();
                  }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
};

export default Sidebar;