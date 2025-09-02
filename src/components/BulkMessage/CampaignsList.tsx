import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, PackageSearch, PlayCircle, PauseCircle, CheckCircle, AlertTriangle } from 'lucide-react';

const CampaignsList: React.FC = () => {
  const { campaigns, loading } = useAppStore();

  const getStatusInfo = (status: string | null) => {
    switch (status) {
      case 'draft': return { icon: <PauseCircle size={16} />, color: 'text-gray-500', label: 'Rascunho' };
      case 'sending': return { icon: <PlayCircle size={16} className="animate-pulse" />, color: 'text-blue-500', label: 'Enviando' };
      case 'completed': return { icon: <CheckCircle size={16} />, color: 'text-green-500', label: 'Concluída' };
      case 'failed': return { icon: <AlertTriangle size={16} />, color: 'text-red-500', label: 'Falhou' };
      default: return { icon: <PauseCircle size={16} />, color: 'text-gray-500', label: 'Desconhecido' };
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-whatsapp-green" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <PackageSearch size={48} className="mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhuma campanha encontrada</h3>
          <p>Crie sua primeira campanha na aba "Nova Campanha".</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progresso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {campaigns.map(campaign => {
                const statusInfo = getStatusInfo(campaign.status);
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{campaign.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-2 text-sm ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                          <div className="bg-whatsapp-green h-2.5 rounded-full" style={{ width: `${campaign.progress || 0}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{campaign.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {campaign.created_at ? format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CampaignsList;
