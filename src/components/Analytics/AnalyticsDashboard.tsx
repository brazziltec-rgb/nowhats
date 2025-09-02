import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Users, CheckCircle, Star, MessageSquare } from 'lucide-react';
import { generateMockAnalytics } from '../../data/mockData';

const AnalyticsDashboard: React.FC = () => {
  const analytics = generateMockAnalytics();

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

  const ticketStatusData = [
    { name: 'Abertos', value: analytics.openTickets, color: '#3B82F6' },
    { name: 'Resolvidos', value: analytics.resolvedTickets, color: '#10B981' },
    { name: 'Pendentes', value: 45, color: '#F59E0B' },
    { name: 'Fechados', value: 23, color: '#6B7280' }
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color: string;
  }> = ({ title, value, icon, trend, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${color}`}>{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')} dark:${color.replace('text-', 'bg-').replace('-600', '-900')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analytics & Relatórios
        </h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Último trimestre</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Tickets"
          value={analytics.totalTickets.toLocaleString()}
          icon={<MessageSquare className="text-blue-600 dark:text-blue-400" size={24} />}
          trend="+12% vs mês anterior"
          color="text-green-600"
        />
        
        <StatCard
          title="Tickets Abertos"
          value={analytics.openTickets}
          icon={<TrendingUp className="text-orange-600 dark:text-orange-400" size={24} />}
          trend="-5% vs semana anterior"
          color="text-green-600"
        />
        
        <StatCard
          title="Tempo Médio de Resposta"
          value={`${analytics.averageResponseTime}min`}
          icon={<Clock className="text-purple-600 dark:text-purple-400" size={24} />}
          trend="-0.8min vs semana anterior"
          color="text-green-600"
        />
        
        <StatCard
          title="Satisfação"
          value={`${analytics.satisfactionRate}/5`}
          icon={<Star className="text-yellow-600 dark:text-yellow-400" size={24} />}
          trend="+0.2 vs mês anterior"
          color="text-green-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets por Hora */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Tickets por Hora
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.ticketsByHour}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 12 }}
                tickFormatter={(hour) => `${hour}h`}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(hour) => `${hour}:00`}
                formatter={(value) => [value, 'Tickets']}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status dos Tickets */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Status dos Tickets
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ticketStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {ticketStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Tickets']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {ticketStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets por Dia */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Tendência de Tickets (Últimos 7 dias)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.ticketsByDay}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
              formatter={(value) => [value, 'Tickets']}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance dos Agentes */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Performance dos Agentes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Agente</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Tickets Resolvidos</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Tempo Médio</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Satisfação</th>
              </tr>
            </thead>
            <tbody>
              {analytics.agentPerformance.map((agent) => (
                <tr key={agent.agentId} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(agent.agentName)}&background=random`}
                        alt={agent.agentName}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {agent.agentName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {agent.ticketsResolved}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {agent.averageResponseTime.toFixed(1)}min
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-400 fill-current" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {agent.satisfactionRate.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
