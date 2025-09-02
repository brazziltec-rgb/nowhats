import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, Edit3 } from 'lucide-react';

interface ActionNodeData {
  label: string;
  action: 'transfer' | 'tag' | 'notify' | 'webhook' | 'wait';
  target: string;
}

const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [action, setAction] = useState(data.action || 'transfer');
  const [target, setTarget] = useState(data.target || '');

  const handleSave = () => {
    setIsEditing(false);
    // Here you would update the node data
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'transfer': return 'Transferir para agente';
      case 'tag': return 'Adicionar tag';
      case 'notify': return 'Notificar equipe';
      case 'webhook': return 'Chamar webhook';
      case 'wait': return 'Aguardar';
      default: return actionType;
    }
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-green-50 border-2 min-w-[200px] ${
      selected ? 'border-green-500' : 'border-green-200'
    } dark:bg-green-900 dark:border-green-700`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-green-600 dark:text-green-400" />
        <div className="font-medium text-green-800 dark:text-green-200 text-sm">
          {data.label}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
        >
          <Edit3 size={14} />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            <option value="transfer">Transferir para agente</option>
            <option value="tag">Adicionar tag</option>
            <option value="notify">Notificar equipe</option>
            <option value="webhook">Chamar webhook</option>
            <option value="wait">Aguardar resposta</option>
          </select>
          
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            placeholder="Destino da ação..."
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
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
        <div className="text-xs text-green-700 dark:text-green-300">
          {getActionLabel(action)}: {target || 'Clique para configurar'}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default ActionNode;
