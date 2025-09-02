import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Edit3 } from 'lucide-react';

interface ConditionNodeData {
  label: string;
  condition: 'contém' | 'igual' | 'diferente' | 'regex';
  value: string;
}

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [condition, setCondition] = useState(data.condition || 'contém');
  const [value, setValue] = useState(data.value || '');

  const handleSave = () => {
    setIsEditing(false);
    // Here you would update the node data
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-yellow-50 border-2 min-w-[200px] ${
      selected ? 'border-yellow-500' : 'border-yellow-200'
    } dark:bg-yellow-900 dark:border-yellow-700`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center gap-2 mb-2">
        <GitBranch size={16} className="text-yellow-600 dark:text-yellow-400" />
        <div className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">
          {data.label}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="ml-auto text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
        >
          <Edit3 size={14} />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as any)}
            className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            <option value="contém">Contém</option>
            <option value="igual">Igual a</option>
            <option value="diferente">Diferente de</option>
            <option value="regex">Expressão regular</option>
          </select>
          
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            placeholder="Valor para comparação..."
          />
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
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
        <div className="text-xs text-yellow-700 dark:text-yellow-300">
          {condition} "{value}" ou clique para editar
        </div>
      )}

      {/* True/False handles */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true"
        className="w-3 h-3"
        style={{ left: '25%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false"
        className="w-3 h-3"
        style={{ left: '75%' }}
      />
      
      <div className="flex justify-between mt-2 text-xs text-yellow-700 dark:text-yellow-300">
        <span>Sim</span>
        <span>Não</span>
      </div>
    </div>
  );
};

export default ConditionNode;
