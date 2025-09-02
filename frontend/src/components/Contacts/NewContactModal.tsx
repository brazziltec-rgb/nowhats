import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface NewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewContactModal: React.FC<NewContactModalProps> = ({ isOpen, onClose }) => {
  const { addContact } = useAppStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  const handleCreate = () => {
    if (name.trim() && phone.trim()) {
      addContact({
        name,
        phone,
        is_group: isGroup,
        last_seen: new Date().toISOString()
      });
      setName('');
      setPhone('');
      setIsGroup(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Adicionar Novo Contato</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
            <input id="contactName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato ou grupo" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green" />
          </div>
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
            <input id="contactPhone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 98765-4321" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-whatsapp-green" />
          </div>
          <div className="flex items-center">
            <input id="isGroup" type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} className="h-4 w-4 text-whatsapp-green rounded border-gray-300" />
            <label htmlFor="isGroup" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">É um grupo?</label>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={handleCreate} disabled={!name.trim() || !phone.trim()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-whatsapp-green rounded-lg hover:bg-whatsapp-dark-green disabled:bg-gray-400">
            <UserPlus size={16} /> Salvar Contato
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewContactModal;
