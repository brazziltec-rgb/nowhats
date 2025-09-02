import React, { useState } from 'react';
import { Upload, Send, AlertTriangle, Trash2 } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useAppStore } from '../../store/useAppStore';

const MAX_FILE_SIZE = 64 * 1024 * 1024; // 64MB

const NewCampaign: React.FC = () => {
  const { channels, addCampaign } = useAppStore();
  const [campaignName, setCampaignName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  
  const onMediaDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setMediaError(null);
    if (fileRejections.length > 0) {
      if (fileRejections[0].file.size > MAX_FILE_SIZE) {
        setMediaError('O arquivo excede o limite de 64MB.');
      } else {
        setMediaError('Tipo de arquivo não suportado.');
      }
      setAttachedMedia(null);
      return;
    }
    if (acceptedFiles.length > 0) {
      setAttachedMedia(acceptedFiles[0]);
    }
  };

  const { getRootProps: mediaRootProps, getInputProps: mediaInputProps } = useDropzone({
    onDrop: onMediaDrop,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov'],
      'application/pdf': ['.pdf'],
    }
  });

  const handleSendMessage = () => {
    if (!campaignName || !messageContent || selectedChannels.length === 0) {
      alert('Por favor, preencha o nome, a mensagem e selecione pelo menos um canal.');
      return;
    }

    addCampaign({
      name: campaignName,
      channel_ids: selectedChannels,
      message_text: messageContent,
      media_url: attachedMedia ? attachedMedia.name : null, 
      media_name: attachedMedia ? attachedMedia.name : null,
      targets: [], // This would be populated from a contact list selector
      scheduled_at: null,
    });
    
    alert('Campanha criada com sucesso!');
    // Reset form
    setCampaignName('');
    setMessageContent('');
    setAttachedMedia(null);
    setSelectedChannels([]);
  };

  const handleChannelSelection = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId) 
        : [...prev, channelId]
    );
  };

  const activeChannels = channels.filter(c => c.status === 'connected');

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col p-4 space-y-4 overflow-y-auto rounded-l-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Detalhes da Campanha</h2>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Campanha</label>
          <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Canais de Envio (Rotação)</label>
          <div className="mt-2 space-y-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-60 overflow-y-auto">
            {activeChannels.length > 0 ? activeChannels.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedChannels.includes(c.id)}
                  onChange={() => handleChannelSelection(c.id)}
                  className="h-4 w-4 text-whatsapp-green rounded border-gray-300 dark:border-gray-500 focus:ring-whatsapp-green"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
              </label>
            )) : (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">Nenhum canal conectado.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="bg-white dark:bg-gray-800 rounded-r-lg border border-gray-200 dark:border-gray-700 p-4 h-full flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Conteúdo da Mensagem</label>
          <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="Digite sua mensagem aqui..." className="w-full flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none" />
          
          <div className="mt-4">
            <div {...mediaRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-whatsapp-green">
              <input {...mediaInputProps()} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Arraste uma mídia aqui, ou clique para selecionar (limite de 64MB).</p>
            </div>
            {mediaError && (
              <div className="flex items-center gap-2 mt-2 text-red-600">
                <AlertTriangle size={16} />
                <span className="text-sm">{mediaError}</span>
              </div>
            )}
            {attachedMedia && !mediaError && (
              <div className="flex items-center justify-between p-2 mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">{attachedMedia.name}</span>
                <button onClick={() => setAttachedMedia(null)}><Trash2 size={16} className="text-red-500" /></button>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button onClick={handleSendMessage} disabled={!messageContent || selectedChannels.length === 0} className="flex items-center gap-2 px-6 py-3 bg-whatsapp-light-green hover:bg-whatsapp-green text-white rounded-lg transition-colors font-bold disabled:bg-gray-400">
              <Send size={16} /> Criar Campanha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCampaign;
