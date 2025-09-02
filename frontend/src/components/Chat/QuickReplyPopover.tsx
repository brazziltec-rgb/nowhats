import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Zap, Search, PlusCircle } from 'lucide-react';

interface QuickReplyPopoverProps {
  onSelect: (content: string) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const QuickReplyPopover: React.FC<QuickReplyPopoverProps> = ({ onSelect, onClose, triggerRef }) => {
  const { quickReplies } = useAppStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerRef]);

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
    >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Buscar resposta rápida..."
            className="w-full pl-8 pr-2 py-1 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {quickReplies.length > 0 ? (
          quickReplies.map(reply => (
            <div
              key={reply.id}
              onClick={() => onSelect(reply.content)}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{reply.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{reply.content}</p>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhuma resposta rápida encontrada.
          </div>
        )}
      </div>
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button className="w-full flex items-center justify-center gap-2 text-sm text-whatsapp-green hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md">
          <PlusCircle size={16} />
          Gerenciar Respostas
        </button>
      </div>
    </div>
  );
};

export default QuickReplyPopover;
