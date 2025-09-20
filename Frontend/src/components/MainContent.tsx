import React from 'react';
import DashboardView from './DashboardView';
import StudyPlanView from './StudyPlanView';
import QuizzesView from './QuizzesView';
import StudyGroupsView from './StudyGroupsView';

interface MainContentProps {
  activeSection: string;
  onStartQuiz: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ activeSection, onStartQuiz }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'study-plan':
        return <StudyPlanView />;
      case 'quizzes':
        return <QuizzesView onStartQuiz={onStartQuiz} />;
      case 'study-groups':
        return <StudyGroupsView />;
      default:
        return <DashboardView onStartQuiz={onStartQuiz} />;
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl">
      {renderContent()}
    </main>
  );
};

export default MainContent;