import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { channelsAPI } from '../../lib/api';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  onConnected: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ 
  isOpen, 
  onClose, 
  channelId, 
  channelName, 
  onConnected 
}) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await channelsAPI.getQRCode(channelId);
      if (response.data.success) {
        setQrCode(response.data.data.qrCode);
      } else {
        setError('QR Code não disponível');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao obter QR Code');
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await channelsAPI.getStatus(channelId);
      if (response.data.success) {
        const channelStatus = response.data.data.status;
        if (channelStatus === 'connected') {
          setStatus('connected');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setTimeout(() => {
            onConnected();
            onClose();
          }, 2000);
        } else if (channelStatus === 'error') {
          setStatus('error');
          setError('Erro na conexão');
        }
      }
    } catch (err: any) {
      console.error('Erro ao verificar status:', err);
    }
  };

  useEffect(() => {
    if (isOpen && channelId) {
      fetchQRCode();
      
      // Polling para verificar status da conexão
      const interval = setInterval(checkConnectionStatus, 3000);
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isOpen, channelId]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleRefresh = () => {
    fetchQRCode();
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setQrCode(null);
    setError(null);
    setStatus('connecting');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Conectar WhatsApp
          </h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
              {channelName}
            </h3>
            
            {status === 'connecting' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Escaneie o QR Code com seu WhatsApp
              </p>
            )}
            
            {status === 'connected' && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <p className="text-sm font-medium">Conectado com sucesso!</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex items-center justify-center gap-2 text-red-600">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">Erro na conexão</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center space-y-4">
            {loading && (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <RefreshCw className="animate-spin text-gray-400" size={32} />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <AlertCircle className="text-red-400" size={32} />
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw size={16} />
                  Tentar Novamente
                </button>
              </div>
            )}

            {qrCode && status === 'connecting' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <RefreshCw size={16} />
                  Atualizar QR Code
                </button>
              </div>
            )}

            {status === 'connected' && (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-green-300 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="text-green-500" size={64} />
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>1. Abra o WhatsApp no seu celular</p>
            <p>2. Toque em Menu ou Configurações</p>
            <p>3. Toque em Aparelhos conectados</p>
            <p>4. Toque em Conectar um aparelho</p>
            <p>5. Aponte seu celular para esta tela para capturar o código</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;