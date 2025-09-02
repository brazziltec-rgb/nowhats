import React, { useState } from 'react';
import NewCampaign from './NewCampaign';
import CampaignsList from './CampaignsList';

const BulkMessageInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('new');

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Campanhas</h1>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'text-whatsapp-green border-b-2 border-whatsapp-green'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Nova Campanha
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-whatsapp-green border-b-2 border-whatsapp-green'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'new' ? <NewCampaign /> : <CampaignsList />}
      </div>
    </div>
  );
};

export default BulkMessageInterface;
