import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import ConnectionCard from './ConnectionCard';
import NewConnectionModal from './NewConnectionModal';

const ChannelsInterface: React.FC = () => {
  const { channels, loading } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-whatsapp-green" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Canais de Comunicação
          </h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green hover:bg-whatsapp-dark-green text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nova Conexão
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Gerencie suas conexões com as APIs do WhatsApp.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {channels.map(channel => (
            <ConnectionCard key={channel.id} channel={channel} />
          ))}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:border-whatsapp-green hover:text-whatsapp-green transition-all duration-300 min-h-[250px]"
          >
            <Plus size={48} />
            <span className="mt-2 font-medium">Adicionar Novo Canal</span>
          </button>
        </div>
      </div>

      <NewConnectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default ChannelsInterface;
