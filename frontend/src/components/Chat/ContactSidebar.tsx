import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Calendar, 
  Star, 
  FileText,
  Users,
  Tag,
  Clock
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ContactSidebar: React.FC = () => {
  const { selectedTicket, contacts, agents } = useAppStore();
  const [activeTab, setActiveTab] = useState('info');
  const [newNote, setNewNote] = useState('');

  if (!selectedTicket) return null;

  const contact = contacts.find(c => c.id === selectedTicket.contact_id);
  const assignedAgent = agents.find(a => a.id === selectedTicket.agent_id);

  const sidebarTabs = [
    { id: 'info', label: 'Info', icon: User },
    { id: 'notes', label: 'Notas', icon: FileText },
    { id: 'history', label: 'Histórico', icon: Clock },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}
      />
    ));
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={contact?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact?.name || '')}&background=random`}
            alt={contact?.name}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {contact?.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {contact?.is_group ? 'Grupo' : 'Contato'}
            </p>
          </div>
        </div>

        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-whatsapp-green shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Informações de Contato
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {contact?.phone}
                  </span>
                </div>
                {contact?.last_seen && (
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Visto por último: {format(new Date(contact.last_seen), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Informações do Ticket
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Protocolo:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedTicket.protocol}
                  </span>
                </div>
                {assignedAgent && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Agente:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {assignedAgent.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedTicket.tags && selectedTicket.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTicket.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedTicket.rating && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Avaliação
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {renderStars(selectedTicket.rating)}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedTicket.rating}/5
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactSidebar;
