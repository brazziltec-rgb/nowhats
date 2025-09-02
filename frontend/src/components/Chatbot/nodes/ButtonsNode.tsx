import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MousePointerClick, Edit3, Plus, Trash2 } from 'lucide-react';

interface ButtonsNodeData {
  label: string;
  message: string;
  buttons: string[];
}

const ButtonsNode: React.FC<NodeProps<ButtonsNodeData>> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(data.message || '');
  const [buttons, setButtons] = useState<string[]>(data.buttons || ['Opção 1']);

  const handleSave = () => setIsEditing(false);

  const updateButtonText = (index: number, text: string) => {
    const newButtons = [...buttons];
    newButtons[index] = text;
    setButtons(newButtons);
  };

  const addButton = () => setButtons([...buttons, `Opção ${buttons.length + 1}`]);
  const removeButton = (index: number) => setButtons(buttons.filter((_, i) => i !== index));

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg bg-indigo-50 border-2 min-w-[220px] ${
      selected ? 'border-indigo-500' : 'border-indigo-200'
    } dark:bg-indigo-900/80 dark:border-indigo-700`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-indigo-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <MousePointerClick size={16} className="text-indigo-600 dark:text-indigo-400" />
        <div className="font-medium text-indigo-800 dark:text-indigo-200 text-sm">{data.label}</div>
        <button onClick={() => setIsEditing(true)} className="ml-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"><Edit3 size={14} /></button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full text-xs p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" rows={2} placeholder="Texto da mensagem..." />
          <div className="space-y-1">
            {buttons.map((btn, index) => (
              <div key={index} className="flex items-center gap-1">
                <input type="text" value={btn} onChange={(e) => updateButtonText(index, e.target.value)} className="flex-grow text-xs p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" />
                <button onClick={() => removeButton(index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <button onClick={addButton} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"><Plus size={12} /> Adicionar botão</button>
          <div className="flex gap-2 mt-2">
            <button onClick={handleSave} className="px-3 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600">Salvar</button>
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-indigo-700 dark:text-indigo-300">
          <p className="mb-2">"{message || 'Mensagem não definida'}"</p>
          <div className="space-y-1">
            {buttons.map((btn, index) => (
              <div key={index} className="relative text-center bg-white dark:bg-indigo-800 border border-indigo-200 dark:border-indigo-600 rounded p-1">
                {btn}
                <Handle type="source" position={Position.Right} id={`btn-${index}`} className="w-2 h-2 !bg-indigo-500" style={{ top: `${(index + 1) * (100 / (buttons.length + 1))}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ButtonsNode;
