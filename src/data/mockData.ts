import { faker } from '@faker-js/faker';
import { Contact, Message, Ticket, Agent, QuickReply, Analytics, Channel } from '../types';

// Generate mock contacts
export const generateMockContacts = (count: number = 50): Contact[] => {
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: faker.phone.number('+55 11 9####-####'),
    avatar: faker.image.avatar(),
    lastSeen: faker.date.recent({ days: 7 }),
    isGroup: faker.datatype.boolean({ probability: 0.2 }),
    groupMembers: faker.datatype.boolean({ probability: 0.2 }) 
      ? Array.from({ length: faker.number.int({ min: 3, max: 15 }) }, () => faker.person.fullName())
      : undefined
  }));
};

// Generate mock messages
export const generateMockMessages = (contacts: Contact[], count: number = 200): Message[] => {
  const messageTypes = ['text', 'image', 'audio', 'video', 'document'] as const;
  
  return Array.from({ length: count }, () => {
    const contact = faker.helpers.arrayElement(contacts);
    const type = faker.helpers.arrayElement(messageTypes);
    
    return {
      id: faker.string.uuid(),
      contactId: contact.id,
      content: type === 'text' ? faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })) : `${type} file`,
      type,
      timestamp: faker.date.recent({ days: 30 }),
      isFromContact: faker.datatype.boolean(),
      status: faker.helpers.arrayElement(['sent', 'delivered', 'read']),
      fileUrl: type !== 'text' ? faker.image.url() : undefined,
      fileName: type !== 'text' ? `file.${type}` : undefined
    };
  });
};

// Generate mock tickets
export const generateMockTickets = (contacts: Contact[], agents: Agent[]): Ticket[] => {
  return contacts.slice(0, 30).map(contact => ({
    id: faker.string.uuid(),
    contactId: contact.id,
    agentId: faker.helpers.maybe(() => faker.helpers.arrayElement(agents).id, { probability: 0.7 }),
    status: faker.helpers.arrayElement(['open', 'pending', 'resolved', 'closed']),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
    department: faker.helpers.arrayElement(['Vendas', 'Suporte', 'Financeiro', 'Geral']),
    tags: faker.helpers.arrayElements(['urgente', 'follow-up', 'novo-cliente', 'reclamação', 'dúvida'], { min: 0, max: 3 }),
    createdAt: faker.date.recent({ days: 30 }),
    updatedAt: faker.date.recent({ days: 7 }),
    rating: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 }), { probability: 0.3 }),
    notes: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => faker.lorem.sentence()),
    protocol: `#${faker.number.int({ min: 1000, max: 9999 })}`
  }));
};

// Generate mock agents
export const generateMockAgents = (): Agent[] => {
  return [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@empresa.com',
      avatar: faker.image.avatar(),
      status: 'online',
      department: 'Suporte',
      role: 'agent'
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@empresa.com',
      avatar: faker.image.avatar(),
      status: 'online',
      department: 'Vendas',
      role: 'agent'
    },
    {
      id: '3',
      name: 'Pedro Costa',
      email: 'pedro@empresa.com',
      avatar: faker.image.avatar(),
      status: 'away',
      department: 'Financeiro',
      role: 'supervisor'
    }
  ];
};

// Generate mock quick replies
export const generateMockQuickReplies = (): QuickReply[] => {
  return [
    {
      id: '1',
      title: 'Bom dia',
      content: 'Bom dia! Como posso ajudá-lo hoje?',
      category: 'Saudações',
      shortcut: '/bomdia'
    },
    {
      id: '2',
      title: 'Informações de contato',
      content: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Telefone: (11) 1234-5678',
      category: 'Informações',
      shortcut: '/contato'
    },
    {
      id: '3',
      title: 'Aguardar',
      content: 'Aguarde um momento enquanto verifico essa informação para você.',
      category: 'Padrão',
      shortcut: '/aguardar'
    }
  ];
};

// Generate mock analytics
export const generateMockAnalytics = (): Analytics => {
  return {
    totalTickets: 1245,
    openTickets: 87,
    resolvedTickets: 1158,
    averageResponseTime: 4.2,
    satisfactionRate: 4.6,
    agentPerformance: [
      {
        agentId: '1',
        agentName: 'João Silva',
        ticketsResolved: 156,
        averageResponseTime: 3.8,
        satisfactionRate: 4.7
      },
      {
        agentId: '2',
        agentName: 'Maria Santos',
        ticketsResolved: 142,
        averageResponseTime: 4.1,
        satisfactionRate: 4.5
      },
      {
        agentId: '3',
        agentName: 'Pedro Costa',
        ticketsResolved: 98,
        averageResponseTime: 5.2,
        satisfactionRate: 4.4
      }
    ],
    ticketsByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: faker.number.int({ min: 5, max: 45 })
    })),
    ticketsByDay: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: faker.number.int({ min: 20, max: 80 })
    }))
  };
};

export const generateInitialChannels = (): Channel[] => {
  return [
    {
      id: 'channel_1',
      name: 'Vendas Principal',
      api: 'baileys',
      status: 'connected',
      lastSync: faker.date.recent(),
      instanceId: 'vendas-01'
    },
    {
      id: 'channel_2',
      name: 'Suporte Técnico',
      api: 'evolution',
      status: 'disconnected',
      lastSync: faker.date.past(),
      instanceId: 'suporte-01'
    }
  ];
};
