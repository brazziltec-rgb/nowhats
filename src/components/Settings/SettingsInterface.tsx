import React, { useState } from 'react';
import { 
  Wifi, 
  Bot, 
  Users, 
  Webhook, 
  Bell, 
  Palette, 
  Shield, 
  Database,
  Zap
} from 'lucide-react';
import WhatsAppSettings from './WhatsAppSettings';
import QuickRepliesManager from './QuickRepliesManager';

const SettingsInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('whatsapp');

  const tabs = [
    { id: 'whatsapp', label: 'APIs WhatsApp', icon: Wifi },
    { id: 'quick-replies', label: 'Respostas Rápidas', icon: Zap },
    { id: 'chatbot', label: 'Chatbot', icon: Bot },
    { id: 'agents', label: 'Agentes', icon: Users },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'database', label: 'Banco de Dados', icon: Database },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'whatsapp':
        return <WhatsAppSettings />;
      case 'quick-replies':
        return <QuickRepliesManager />;
      default:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <div className="p-8 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-300">
                Esta seção está em desenvolvimento...
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Configurações
          </h2>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-whatsapp-green/10 dark:bg-whatsapp-green/20 text-whatsapp-green'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsInterface;
