import React from 'react';
import QRCode from "react-qr-code";
import { channelsAPI } from '../../lib/api';
import { Tables } from '../../types/supabase';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, MoreVertical, Trash2, Link } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConnectionCardProps {
  channel: Tables<'channels'>;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ channel }) => {
  const { updateChannelStatus, removeChannel } = useAppStore();

  const handleConnect = async () => {
    // Set state to connecting immediately for better UX
    updateChannelStatus(channel.id, 'connecting');
    try {
      // Call the backend to initiate the connection process
      const response = await channelsAPI.connect(channel.id);
      
      // If QR code is returned, update it immediately
      if (response.data.qrCode) {
        updateChannelStatus(channel.id, 'connecting', response.data.qrCode);
      }
      
      // Start polling for status updates
      pollForStatusUpdates(channel.id);
    } catch (error) {
      console.error('Failed to initiate connection:', error);
      // Revert status on error
      updateChannelStatus(channel.id, 'error');
    }
  };

  const handleDisconnect = async () => {
    try {
      await channelsAPI.disconnect(channel.id);
      updateChannelStatus(channel.id, 'disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Poll for status updates when connecting
  const pollForStatusUpdates = async (channelId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await channelsAPI.getStatus(channelId);
        const { status, qrCode } = response.data;
        
        updateChannelStatus(channelId, status, qrCode);
        
        // Stop polling if connected or error
        if (status === 'connected' || status === 'error') {
          return;
        }
        
        // Continue polling if still connecting
        if (status === 'connecting' && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
        updateChannelStatus(channelId, 'error');
      }
    };
    
    // Start polling after initial delay
     setTimeout(poll, 2000);
   };

  const getStatusInfo = (status: Tables<'channels'>['status']) => {
    switch (status) {
      case 'connected':
        return { icon: <Wifi />, color: 'text-whatsapp-light-green', text: 'Conectado' };
      case 'disconnected':
        return { icon: <WifiOff />, color: 'text-red-500', text: 'Desconectado' };
      case 'connecting':
        return { icon: <RefreshCw className="animate-spin" />, color: 'text-yellow-500', text: 'Conectando...' };
      case 'error':
        return { icon: <AlertTriangle />, color: 'text-orange-500', text: 'Erro' };
      default:
        return { icon: <AlertTriangle />, color: 'text-gray-500', text: 'Desconhecido' };
    }
  };

  const statusInfo = getStatusInfo(channel.status);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{channel.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{channel.api}</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.icon}
          <span>{statusInfo.text}</span>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[150px]">
        {channel.status === 'connecting' && channel.qr_code ? (
          <div className="text-center p-2 bg-white rounded-lg">
            <QRCode value={channel.qr_code} size={140} />
            <p className="text-xs text-gray-600 mt-2">Escaneie com seu WhatsApp</p>
          </div>
        ) : channel.status === 'connected' ? (
          <div className="text-center">
            <Wifi size={48} className="text-whatsapp-light-green mx-auto" />
            <p className="mt-2 text-gray-700 dark:text-gray-300">Sessão ativa</p>
            {channel.last_sync && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Última sicronização: {formatDistanceToNow(new Date(channel.last_sync), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <WifiOff size={48} className="text-red-500 mx-auto" />
            <p className="mt-2 text-gray-700 dark:text-gray-300">Sessão inativa</p>
            <button 
              onClick={handleConnect}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-whatsapp-green hover:bg-whatsapp-dark-green text-white rounded-lg transition-colors text-sm"
            >
              <Link size={14} /> Conectar
            </button>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <button 
          onClick={() => removeChannel(channel.id)}
          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md"
        >
          <Trash2 size={16} />
        </button>
        {channel.status === 'connected' && (
          <button 
            onClick={handleDisconnect}
            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            Desconectar
          </button>
        )}
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
};

export default ConnectionCard;
