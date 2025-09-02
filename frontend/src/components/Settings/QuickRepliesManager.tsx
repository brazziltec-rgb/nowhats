import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Edit, Trash2, Save, X, Loader2, MessageSquare } from 'lucide-react';
import { Tables, TablesInsert } from '../../types/supabase';

const QuickRepliesManager: React.FC = () => {
  const { quickReplies, addQuickReply, updateQuickReply, deleteQuickReply, loading } = useAppStore();
  const [editingReply, setEditingReply] = useState<Tables<'quick_replies'> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = (replyData: Omit<TablesInsert<'quick_replies'>, 'user_id' | 'created_at'>, id?: string) => {
    if (id) {
      updateQuickReply(id, replyData);
    } else {
      addQuickReply(replyData);
    }
    setEditingReply(null);
    setIsCreating(false);
  };

  const ReplyForm: React.FC<{ reply?: Tables<'quick_replies'>; onCancel: () => void; onSave: (data: Omit<TablesInsert<'quick_replies'>, 'user_id' | 'created_at'>, id?: string) => void }> = ({ reply, onCancel, onSave }) => {
    const [title, setTitle] = useState(reply?.title || '');
    const [content, setContent] = useState(reply?.content || '');
    const [shortcut, setShortcut] = useState(reply?.shortcut || '');

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!title || !content) return;
      onSave({ title, content, shortcut, category: 'Geral' }, reply?.id);
    };

    return (
      <tr className="bg-gray-50 dark:bg-gray-700">
        <td className="px-6 py-4" colSpan={4}>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600" />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Conteúdo da resposta" className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600" rows={3}></textarea>
            <input type="text" value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="Atalho (ex: /saudacao)" className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-md text-sm"><X size={14} /> Cancelar</button>
              <button type="submit" className="flex items-center gap-1 px-3 py-1 bg-whatsapp-green text-white rounded-md text-sm"><Save size={14} /> Salvar</button>
            </div>
          </form>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Gerenciar Respostas Rápidas
        </h3>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green text-white rounded-lg text-sm">
          <Plus size={16} /> Nova Resposta
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Atalho</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Conteúdo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {isCreating && <ReplyForm onCancel={() => setIsCreating(false)} onSave={handleSave} />}
            {quickReplies.map(reply => (
              editingReply?.id === reply.id ? (
                <ReplyForm key={reply.id} reply={reply} onCancel={() => setEditingReply(null)} onSave={handleSave} />
              ) : (
                <tr key={reply.id}>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{reply.title}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400"><code>{reply.shortcut}</code></td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 truncate max-w-sm">{reply.content}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => setEditingReply(reply)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md"><Edit size={16} /></button>
                    <button onClick={() => deleteQuickReply(reply.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-4 text-center"><Loader2 className="animate-spin inline-block" /></div>
        )}
        {!loading && quickReplies.length === 0 && !isCreating && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <p>Nenhuma resposta rápida cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickRepliesManager;
