import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, User, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../../store/useAppStore';
import NewContactModal from './NewContactModal';

const ContactsInterface: React.FC = () => {
  const { contacts, loading } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'individual' | 'group'>('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone.includes(searchTerm);
    const matchesFilter = filter === 'all' || 
                         (filter === 'individual' && !contact.is_group) ||
                         (filter === 'group' && contact.is_group);
    return matchesSearch && matchesFilter;
  });

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-whatsapp-green" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contatos</h1>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green hover:bg-whatsapp-dark-green text-white rounded-lg transition-colors">
              <Plus size={16} />
              Novo Contato
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="individual">Individuais</option>
              <option value="group">Grupos</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
              <div className="px-4 py-3 flex items-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input type="checkbox" onChange={handleSelectAll} className="h-4 w-4 text-whatsapp-green rounded border-gray-300 dark:border-gray-600" />
                <div className="w-12"></div>
                <div className="flex-1">Nome</div>
                <div className="w-32">Telefone</div>
                <div className="w-24">Tipo</div>
                <div className="w-32">Último Acesso</div>
                <div className="w-8"></div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-4 bg-white dark:bg-gray-800">
                  <input type="checkbox" checked={selectedContacts.includes(contact.id)} onChange={() => handleSelectContact(contact.id)} className="h-4 w-4 text-whatsapp-green rounded border-gray-300 dark:border-gray-600" />
                  <img src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} alt={contact.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{contact.name}</div>
                  </div>
                  <div className="w-32 text-sm text-gray-600 dark:text-gray-400">{contact.phone}</div>
                  <div className="w-24">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${contact.is_group ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'}`}>
                      {contact.is_group ? <Users size={12} /> : <User size={12} />}
                      {contact.is_group ? 'Grupo' : 'Individual'}
                    </span>
                  </div>
                  <div className="w-32 text-sm text-gray-600 dark:text-gray-400">
                    {contact.last_seen && format(new Date(contact.last_seen), 'dd/MM HH:mm', { locale: ptBR })}
                  </div>
                  <div className="w-8"><button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><MoreVertical size={16} className="text-gray-400" /></button></div>
                </div>
              ))}
            </div>

            {filteredContacts.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800">
                <Users size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">Nenhum contato encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <NewContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default ContactsInterface;
