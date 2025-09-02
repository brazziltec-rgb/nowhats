import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home,
  MessageSquare, 
  Users, 
  Settings, 
  Bot, 
  Send, 
  Workflow,
  Rss,
  Moon,
  Sun,
  ChevronsLeft,
  ChevronsRight,
  LogOut
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { authAPI } from '../../lib/api';

const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, user, setUser, setIsAuthenticated } = useAppStore();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const menuItems = [
    { id: 'home', path: '/home', label: 'Home', icon: Home },
    { id: 'chat', path: '/chat', label: 'Atendimento', icon: MessageSquare },
    { id: 'contacts', path: '/contacts', label: 'Contatos', icon: Users },
    { id: 'bulk', path: '/bulk', label: 'Campanhas', icon: Send },
    { id: 'chatbot', path: '/chatbot', label: 'Chatbot', icon: Bot },
    { id: 'kanban', path: '/kanban', label: 'Kanban', icon: Workflow },
    { id: 'channels', path: '/channels', label: 'Canais', icon: Rss },
    { id: 'settings', path: '/settings', label: 'Configurações', icon: Settings }
  ];

  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
      {/* Header */}
      <div className="p-4 h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
        {sidebarOpen ? (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            AtendeZap
          </h1>
        ) : (
          <Bot size={28} className="text-whatsapp-green" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-whatsapp-green text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    } ${!sidebarOpen ? 'justify-center' : ''}`
                  }
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon size={20} />
                  {sidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {sidebarOpen ? (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-whatsapp-green rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role || 'Agent'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 bg-whatsapp-green rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? (darkMode ? 'Modo Claro' : 'Modo Escuro') : undefined}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {sidebarOpen && (
              <span className="font-medium">
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
            title="Sair"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Sair</span>}
          </button>
          
          <button
            onClick={toggleSidebar}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? 'Expandir' : 'Recolher'}
          >
            {sidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
            {sidebarOpen && (
              <span className="font-medium">
                Recolher
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
