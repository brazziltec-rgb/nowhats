import React, { useState } from 'react';
import { X, Wifi } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Enums } from '../../types/supabase';

type ChannelApiType = Enums<'channel_api_type'>;

interface NewConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const apiOptions: { id: ChannelApiType; name: string; description: string }[] = [
  { id: 'baileys', name: 'Baileys', description: 'Nativa, leve e rápida. Ideal para a maioria dos casos.' },
  { id: 'evolution', name: 'Evolution API', description: 'Robusta e escalável, com mais recursos de automação.' },
  { id: 'web-js', name: 'WhatsApp Web.js', description: 'Baseada em navegador, alta compatibilidade.' },
];

const NewConnectionModal: React.FC<NewConnectionModalProps> = ({ isOpen, onClose }) => {
  const { addChannel } = useAppStore();
  const [channelName, setChannelName] = useState('');
  const [selectedApi, setSelectedApi] = useState<ChannelApiType>('baileys');

  const handleCreate = () => {
    if (channelName.trim()) {
      addChannel(channelName, selectedApi);
      setChannelName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Criar Nova Conexão</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome do Canal
            </label>
            <input
              id="channelName"
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Ex: Vendas, Suporte Principal"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecione a API
            </h3>
            <div className="space-y-3">
              {apiOptions.map(api => (
                <label
                  key={api.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedApi === api.id 
                      ? 'border-whatsapp-green bg-whatsapp-chat-green/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="api-option"
                    value={api.id}
                    checked={selectedApi === api.id}
                    onChange={() => setSelectedApi(api.id)}
                    className="h-4 w-4 text-whatsapp-green border-gray-300 focus:ring-whatsapp-green"
                  />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{api.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{api.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!channelName.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-whatsapp-green rounded-lg hover:bg-whatsapp-dark-green disabled:bg-gray-400"
          >
            <Wifi size={16} />
            Criar Canal
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConnectionModal;
