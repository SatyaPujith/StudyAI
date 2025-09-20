import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import RightPanel from './components/RightPanel';
import QuizModal from './components/QuizModal';
import { Toaster } from 'sonner';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex pt-16">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="flex-1 lg:ml-64">
          <div className="flex flex-col xl:flex-row min-h-[calc(100vh-4rem)]">
            <MainContent
              activeSection={activeSection}
              onStartQuiz={() => setQuizModalOpen(true)}
            />
            <RightPanel />
          </div>
        </div>
      </div>

      <QuizModal
        open={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider children={undefined}>
      <AppContent />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}

export default App;