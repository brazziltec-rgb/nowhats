import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageCircle, Edit3, Image, FileText } from 'lucide-react';

interface MessageNodeData {
  label: string;
  message: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  buttons?: Array<{ text: string; action: string }>;
}

const MessageNode: React.FC<NodeProps<MessageNodeData>> = ({ data, id, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(data.message || '');
  const [messageType, setMessageType] = useState(data.type || 'text');

  const handleSave = () => {
    setIsEditing(false);
    // Here you would update the node data
  };

  const getIcon = () => {
    switch (messageType) {
      case 'image': return <Image size={16} />;
      case 'document': return <FileText size={16} />;
      default: return <MessageCircle size={16} />;
    }
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-blue-50 border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-blue-200'
    } dark:bg-blue-900 dark:border-blue-700`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="text-blue-600 dark:text-blue-400">
          {getIcon()}
        </div>
        <div className="font-medium text-blue-800 dark:text-blue-200 text-sm">
          {data.label}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
        >
          <Edit3 size={14} />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as any)}
            className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            <option value="text">Texto</option>
            <option value="image">Imagem</option>
            <option value="audio">Áudio</option>
            <option value="document">Documento</option>
          </select>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            rows={3}
            placeholder="Digite a mensagem..."
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Salvar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-blue-700 dark:text-blue-300">
          {message || 'Clique para editar'}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default MessageNode;
