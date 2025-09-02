import React, { useState, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Eye,
  UserCheck,
  RotateCcw,
  CheckCircle,
  X,
  ArrowRight,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QuickReplyPopover from './QuickReplyPopover';

const ChatWindow: React.FC = () => {
  const { selectedTicket, contacts, messages, activeTab, addMessage } = useAppStore();
  const [messageText, setMessageText] = useState('');
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);
  const quickReplyButtonRef = useRef<HTMLButtonElement>(null);

  if (!selectedTicket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Selecione um ticket</h3>
          <p>Escolha um ticket da lista para iniciar o atendimento</p>
        </div>
      </div>
    );
  }

  const contact = contacts.find(c => c.id === selectedTicket.contact_id);
  const ticketMessages = messages.filter(m => m.ticket_id === selectedTicket.id);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      addMessage({
        ticket_id: selectedTicket.id,
        content: messageText,
        type: 'text',
        is_from_contact: false,
        status: 'sent',
      });
      setMessageText('');
    }
  };

  const handleInsertQuickReply = (content: string) => {
    setMessageText(prev => prev ? `${prev} ${content}` : content);
    setIsQuickReplyOpen(false);
  };

  const quickActions = [
    { icon: Eye, label: 'Espiar', action: () => console.log('Spy mode') },
    { icon: UserCheck, label: 'Assumir', action: () => console.log('Take ticket') },
    { icon: RotateCcw, label: 'Retornar', action: () => console.log('Return to queue') },
    { icon: CheckCircle, label: 'Resolver', action: () => console.log('Resolve') },
    { icon: X, label: 'Finalizar', action: () => console.log('Close') },
    { icon: ArrowRight, label: 'Transferir', action: () => console.log('Transfer') }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={contact?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact?.name || '')}&background=random`}
              alt={contact?.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {contact?.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contact?.phone} • {selectedTicket.protocol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'pending' && (
              <div className="flex items-center gap-1 mr-4">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={action.label}
                  >
                    <action.icon size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                ))}
              </div>
            )}
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100/50 dark:bg-gray-900/50">
        {ticketMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
          </div>
        ) : (
          ticketMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_from_contact ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                message.is_from_contact
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                  : 'bg-whatsapp-chat-green dark:bg-whatsapp-green text-gray-900 dark:text-white rounded-br-none'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 text-right ${
                  message.is_from_contact 
                    ? 'text-gray-500 dark:text-gray-400' 
                    : 'text-gray-600 dark:text-gray-200'
                }`}>
                  {message.timestamp && format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="relative">
            <button
              ref={quickReplyButtonRef}
              onClick={() => setIsQuickReplyOpen(!isQuickReplyOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Respostas Rápidas"
            >
              <Zap size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            {isQuickReplyOpen && (
              <QuickReplyPopover 
                onSelect={handleInsertQuickReply}
                onClose={() => setIsQuickReplyOpen(false)}
                triggerRef={quickReplyButtonRef}
              />
            )}
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite sua mensagem..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
            />
          </div>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Smile size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="p-3 bg-whatsapp-green hover:bg-whatsapp-dark-green disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-full transition-colors"
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
