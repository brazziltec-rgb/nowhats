import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Clock, User, Tag, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tables } from '../../types/supabase';

const TicketList: React.FC = () => {
  const { tickets, contacts, activeTab, selectedTicket, setSelectedTicket } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter tickets based on active tab and search
  const filteredTickets = tickets
    .filter(ticket => ticket.status === activeTab)
    .filter(ticket => {
      if (!searchTerm) return true;
      const contact = contacts.find(c => c.id === ticket.contact_id);
      return contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             contact?.phone.includes(searchTerm) ||
             (ticket.protocol && ticket.protocol.includes(searchTerm));
    });

  const getContact = (contactId: string) => {
    return contacts.find(c => c.id === contactId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Filter size={16} />
          Filtros
        </button>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum ticket encontrado</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredTickets.map((ticket) => {
              const contact = getContact(ticket.contact_id);
              if (!contact) return null;

              const isSelected = selectedTicket?.id === ticket.id;

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    isSelected
                      ? 'bg-whatsapp-chat-green/20 dark:bg-whatsapp-dark-green/30 border-whatsapp-green'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                        alt={contact.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {contact.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.protocol}
                        </p>
                      </div>
                    </div>
                    
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                      <MoreVertical size={14} className="text-gray-400" />
                    </button>
                  </div>

                  {ticket.priority && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                        {ticket.department}
                      </span>
                    </div>
                  )}

                  {ticket.tags && ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ticket.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                      {ticket.tags.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{ticket.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {ticket.updated_at && format(new Date(ticket.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </div>
                    
                    {ticket.agent_id && (
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        <span>Atribuído</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketList;
