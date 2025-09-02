import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Clock, User, Tag, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../../store/useAppStore';
import { Tables, Enums } from '../../types/supabase';

type TicketStatus = Enums<'ticket_status'>;

interface KanbanColumn {
  id: TicketStatus;
  title: string;
  color: string;
  tickets: Tables<'tickets'>[];
}

const KanbanBoard: React.FC = () => {
  const { tickets, contacts, agents, loading, updateTicketStatus } = useAppStore();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);

  useEffect(() => {
    const open: KanbanColumn = { id: 'open', title: 'Abertos', color: 'bg-blue-100 border-blue-200 text-blue-800', tickets: [] };
    const pending: KanbanColumn = { id: 'pending', title: 'Em Andamento', color: 'bg-yellow-100 border-yellow-200 text-yellow-800', tickets: [] };
    const resolved: KanbanColumn = { id: 'resolved', title: 'Resolvidos', color: 'bg-green-100 border-green-200 text-green-800', tickets: [] };
    const closed: KanbanColumn = { id: 'closed', title: 'Fechados', color: 'bg-gray-100 border-gray-200 text-gray-800', tickets: [] };

    tickets.forEach(ticket => {
      switch (ticket.status) {
        case 'open': open.tickets.push(ticket); break;
        case 'pending': pending.tickets.push(ticket); break;
        case 'resolved': resolved.tickets.push(ticket); break;
        case 'closed': closed.tickets.push(ticket); break;
      }
    });

    setColumns([open, pending, resolved, closed]);
  }, [tickets]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const newStatus = destination.droppableId as TicketStatus;

    if (source.droppableId !== destination.droppableId) {
      updateTicketStatus(draggableId, newStatus);
    }
    
    // Optimistic UI update
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);
    if (!sourceColumn || !destColumn) return;

    const sourceTickets = Array.from(sourceColumn.tickets);
    const destTickets = source.droppableId === destination.droppableId ? sourceTickets : Array.from(destColumn.tickets);
    const [movedTicket] = sourceTickets.splice(source.index, 1);
    destTickets.splice(destination.index, 0, movedTicket);

    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        return { ...col, tickets: sourceTickets };
      }
      if (col.id === destination.droppableId) {
        return { ...col, tickets: destTickets };
      }
      return col;
    });
    setColumns(newColumns);
  };

  const getContact = (contactId: string) => contacts.find(c => c.id === contactId);
  const getAgent = (agentId?: string | null) => agentId ? agents.find(a => a.id === agentId) : null;

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-whatsapp-green" />
      </div>
    );
  }

  const TicketCard: React.FC<{ ticket: Tables<'tickets'>; index: number }> = ({ ticket, index }) => {
    const contact = getContact(ticket.contact_id);
    const agent = getAgent(ticket.agent_id);

    return (
      <Draggable draggableId={ticket.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 shadow-sm transition-shadow hover:shadow-md ${
              snapshot.isDragging ? 'shadow-lg' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <img
                  src={contact?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact?.name || '')}&background=random`}
                  alt={contact?.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate max-w-32">
                    {contact?.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ticket.protocol}
                  </p>
                </div>
              </div>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                <MoreHorizontal size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Média' : 'Baixa'}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                {ticket.department}
              </span>
            </div>
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {ticket.tags.slice(0, 2).map((tag: string) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    <Tag size={8} /> {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {ticket.updated_at && format(new Date(ticket.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
              </div>
              {agent && (
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span className="truncate max-w-16">{agent.name?.split(' ')[0]}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quadro Kanban</h1>
      </div>
      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 p-6 min-w-max h-full">
            {columns.map((column) => (
              <div key={column.id} className="w-80 flex flex-col">
                <div className={`p-3 rounded-t-lg border-2 ${column.color}`}>
                  <h3 className="font-semibold">{column.title} ({column.tickets.length})</h3>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-b-lg border-2 border-t-0 min-h-96 transition-colors ${column.color.replace('bg-', 'border-').replace('text-', '').replace('-800', '-200')} ${snapshot.isDraggingOver ? 'bg-opacity-50' : ''}`}
                    >
                      {column.tickets.map((ticket, index) => (
                        <TicketCard key={ticket.id} ticket={ticket} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard;
