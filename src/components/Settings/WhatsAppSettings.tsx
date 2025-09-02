import React, { useState } from 'react';
import { 
  QrCode,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const WhatsAppSettings: React.FC = () => {
  const [selectedAPI, setSelectedAPI] = useState('baileys');
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const whatsappAPIs = [
    {
      id: 'baileys',
      name: 'Baileys',
      description: 'API nativa do WhatsApp Web',
      status: 'connected',
      features: ['Multi-device', 'Mídia', 'Grupos', 'Status'],
    },
    {
      id: 'evolution',
      name: 'Evolution API',
      description: 'API robusta para automação',
      status: 'disconnected',
      features: ['Webhooks', 'Chatbot', 'Bulk', 'Analytics'],
    },
    {
      id: 'web-js',
      name: 'WhatsApp Web.js',
      description: 'Puppeteer-based WhatsApp API',
      status: 'disconnected',
      features: ['Web-based', 'Estável', 'Completa'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 dark:text-green-400';
      case 'connecting': return 'text-yellow-600 dark:text-yellow-400';
      case 'disconnected': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle size={16} />;
      case 'connecting': return <RefreshCw size={16} className="animate-spin" />;
      case 'disconnected': return <XCircle size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  const connectAPI = (apiId: string) => {
    setSelectedAPI(apiId);
    setApiStatus('connecting');
    
    // Simulate connection process
    setTimeout(() => {
      setApiStatus('connected');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          APIs do WhatsApp
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Escolha e configure a API do WhatsApp que melhor atende suas necessidades.
        </p>
      </div>

      <div className="grid gap-4">
        {whatsappAPIs.map((api) => (
          <div
            key={api.id}
            className={`p-6 border rounded-lg transition-colors ${
              selectedAPI === api.id
                ? 'border-whatsapp-green bg-whatsapp-green/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="whatsapp-api"
                  value={api.id}
                  checked={selectedAPI === api.id}
                  onChange={() => setSelectedAPI(api.id)}
                  className="h-4 w-4 text-whatsapp-green focus:ring-whatsapp-green"
                />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {api.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {api.description}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center gap-2 ${getStatusColor(api.status)}`}>
                {getStatusIcon(api.status)}
                <span className="text-sm capitalize">{api.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {api.features.map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  {feature}
                </span>
              ))}
            </div>

            {selectedAPI === api.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                {api.status === 'disconnected' ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => connectAPI(api.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green hover:bg-whatsapp-dark-green text-white rounded-lg transition-colors"
                    >
                      <QrCode size={16} />
                      Conectar
                    </button>
                  </div>
                ) : api.status === 'connecting' ? (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Conectando... Escaneie o QR Code no WhatsApp</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle size={16} />
                      <span>Conectado e funcionando</span>
                    </div>
                    <button className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                      Desconectar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {apiStatus === 'connected' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Configurações da Instância
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome da Instância
              </label>
              <input
                type="text"
                defaultValue="Principal"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://seu-servidor.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-whatsapp-green rounded border-gray-300 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Rejeitar chamadas automaticamente
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;
