import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Bot, GitBranch, Zap, Type, MousePointerClick, MessageCircle } from 'lucide-react';
import MessageNode from './nodes/MessageNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import InputNode from './nodes/InputNode';
import ButtonsNode from './nodes/ButtonsNode';
import { useAppStore } from '../../store/useAppStore';

const nodeTypes: NodeTypes = {
  messageNode: MessageNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  inputNode: InputNode,
  buttonsNode: ButtonsNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'messageNode', position: { x: 250, y: 25 }, data: { label: 'Início', message: 'Olá!' } },
];
const initialEdges: Edge[] = [];

const ChatbotEditor: React.FC = () => {
  const { saveChatbotFlow, darkMode } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flowName, setFlowName] = useState('Novo Fluxo de Atendimento');

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `node_${nodes.length + 1}_${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 150, y: Math.random() * 200 + 100 },
      data: { label: `Novo ${type}` },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSaveFlow = () => {
    saveChatbotFlow({
      name: flowName,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      is_active: true,
    });
    alert('Fluxo salvo com sucesso!');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <input type="text" value={flowName} onChange={(e) => setFlowName(e.target.value)} className="text-xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100" />
          <button onClick={handleSaveFlow} className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green hover:bg-whatsapp-dark-green text-white rounded-lg transition-colors"><Save size={16} /> Salvar Fluxo</button>
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nós</h3>
          <button onClick={() => addNode('messageNode')} className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700"><MessageCircle size={16} className="text-blue-500" /> Enviar Mensagem</button>
          <button onClick={() => addNode('buttonsNode')} className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700"><MousePointerClick size={16} className="text-indigo-500" /> Botões</button>
          <button onClick={() => addNode('inputNode')} className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Type size={16} className="text-purple-500" /> Coletar Dados</button>
          <button onClick={() => addNode('conditionNode')} className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700"><GitBranch size={16} className="text-yellow-500" /> Condição</button>
          <button onClick={() => addNode('actionNode')} className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Zap size={16} className="text-green-500" /> Ação</button>
        </div>
        <div className="flex-1 relative">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} className="bg-gray-50 dark:bg-gray-900" fitView>
            <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
            <MiniMap className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
            <Background color={darkMode ? '#444' : '#ddd'} gap={16} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default ChatbotEditor;
