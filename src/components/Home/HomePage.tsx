import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Clock, Users, CheckCircle, Star, MessageSquare, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const HomePage: React.FC = () => {
  const { tickets, currentAgent, loading } = useAppStore();

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-whatsapp-green" />
      </div>
    );
  }

  // Basic analytics derived from tickets
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const pendingTickets = tickets.filter(t => t.status === 'pending').length;

  const ticketStatusData = [
    { name: 'Abertos', value: openTickets, color: '#3B82F6' },
    { name: 'Pendentes', value: pendingTickets, color: '#F59E0B' },
    { name: 'Resolvidos', value: resolvedTickets, color: '#10B981' },
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Olá, {currentAgent?.name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Aqui está um resumo da sua operação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total de Tickets"
          value={totalTickets}
          icon={<MessageSquare className="text-white" size={24} />}
          color="bg-whatsapp-green"
        />
        <StatCard
          title="Tickets Abertos"
          value={openTickets}
          icon={<TrendingUp className="text-white" size={24} />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Tickets Resolvidos"
          value={resolvedTickets}
          icon={<CheckCircle className="text-white" size={24} />}
          color="bg-green-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Distribuição de Status dos Tickets
        </h3>
        {totalTickets > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ticketStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {ticketStatusData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Tickets']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>Nenhum dado de ticket para exibir.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
