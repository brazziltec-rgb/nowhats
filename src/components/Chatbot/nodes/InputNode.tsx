import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Type, Edit3 } from 'lucide-react';

interface InputNodeData {
  label: string;
  variable: string;
  prompt: string;
}

const InputNode: React.FC<NodeProps<InputNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [variable, setVariable] = useState(data.variable || '');
  const [prompt, setPrompt] = useState(data.prompt || '');

  const handleSave = () => setIsEditing(false);

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-purple-50 border-2 min-w-[220px] ${
      selected ? 'border-purple-500' : 'border-purple-200'
    } dark:bg-purple-900/80 dark:border-purple-700`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <Type size={16} className="text-purple-600 dark:text-purple-400" />
        <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">
          {data.label}
        </div>
        <button onClick={() => setIsEditing(true)} className="ml-auto text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"><Edit3 size={14} /></button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" placeholder="Pergunta para o usuário..." />
          <input type="text" value={variable} onChange={(e) => setVariable(e.target.value)} className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" placeholder="Salvar em {{variavel}}" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600">Salvar</button>
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-purple-700 dark:text-purple-300">
          <p className="font-semibold">Pergunta:</p>
          <p className="mb-1">"{prompt || 'Não definido'}"</p>
          <p>Salva em: <code className="bg-purple-200 dark:bg-purple-800 px-1 rounded">{`{{${variable}}}`}</code></p>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
};

export default InputNode;
