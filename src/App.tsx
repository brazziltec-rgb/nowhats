import React, { useState, useEffect } from 'react';
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
import { supabase } from './lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

function App() {
  const { darkMode, session, setSession, fetchInitialData } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (session) {
      fetchInitialData();
    }
  }, [session, fetchInitialData]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa, className: { container: 'w-full' } }}
            theme={darkMode ? 'dark' : 'default'}
            providers={['google', 'github']}
          />
        </div>
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
