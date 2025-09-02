import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import TicketList from './TicketList';
import ChatWindow from './ChatWindow';
import ContactSidebar from './ContactSidebar';
import { Loader2 } from 'lucide-react';

const ChatInterface: React.FC = () => {
  const { 
    tickets, 
    selectedTicket, 
    activeTab,
    setActiveTab,
    loading
  } = useAppStore();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-whatsapp-green" />
      </div>
    );
  }

  const tabs = [
    { id: 'open', label: 'Abertos', count: tickets.filter(t => t.status === 'open').length },
    { id: 'pending', label: 'Pendentes', count: tickets.filter(t => t.status === 'pending').length },
    { id: 'resolved', label: 'Resolvidos', count: tickets.filter(t => t.status === 'resolved').length }
  ];

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Ticket List */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-whatsapp-green dark:text-whatsapp-light-green border-b-2 border-whatsapp-green'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <TicketList />
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex">
        <div className="flex-1">
          <ChatWindow />
        </div>
        
        {/* Contact Sidebar */}
        {selectedTicket && (
          <div className="w-80">
            <ContactSidebar />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
