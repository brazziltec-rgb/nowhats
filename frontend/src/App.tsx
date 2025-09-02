import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import HomePage from './components/Home/HomePage';
import ChatInterface from './components/Chat/ChatInterface';
import ContactsInterface from './components/Contacts/ContactsInterface';
import BulkMessageInterface from './components/BulkMessage/BulkMessageInterface';
import ChatbotEditor from './components/Chatbot/ChatbotEditor';
import KanbanBoard from './components/Kanban/KanbanBoard';
import ChannelsInterface from './components/Channels/ChannelsInterface';
import SettingsInterface from './components/Settings/SettingsInterface';
import { useAppStore } from './store/useAppStore';
import AuthForm from './components/Auth/AuthForm';
import { authAPI } from './lib/api';

function App() {
  const { darkMode, user, isAuthenticated, setUser, setIsAuthenticated, fetchInitialData } = useAppStore();
  const [loading, setLoading] = useState<boolean>(true);

  // Verificar se há token salvo e validar
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await authAPI.getProfile();
          if (response.data.success) {
            setUser(response.data.data.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [setUser, setIsAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchInitialData();
    }
  }, [isAuthenticated, user, fetchInitialData]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAuthSuccess = (userData: { id: string; email: string; name?: string }, token: string): void => {
    // Criar objeto User completo com valores padrão
    const user = {
      id: userData.id,
      name: userData.name || userData.email.split('@')[0],
      email: userData.email,
      phone: undefined as string | undefined,
      role: 'user' as string,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setUser(user);
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <AuthForm onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <Router>
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="/contacts" element={<ContactsInterface />} />
            <Route path="/bulk" element={<BulkMessageInterface />} />
            <Route path="/chatbot" element={<ChatbotEditor />} />
            <Route path="/kanban" element={<KanbanBoard />} />
            <Route path="/channels" element={<ChannelsInterface />} />
            <Route path="/settings" element={<SettingsInterface />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
