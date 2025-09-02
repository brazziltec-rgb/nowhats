import Message from '../models/Message.js';
import Contact from '../models/Contact.js';
import Ticket from '../models/Ticket.js';
import Channel from '../models/Channel.js';
import SessionManager from '../services/SessionManager.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';
import path from 'path';
import { promises as fs } from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        // Tipos de arquivo permitidos
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'), false);
        }
    }
});

class MessageController {
    // Enviar mensagem de texto
    static sendTextMessage = asyncHandler(async (req, res) => {
        const { channelId, to, message } = req.body;

        // Validar dados obrigatórios
        if (!channelId || !to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Canal, destinatário e mensagem são obrigatórios'
            });
        }

        try {
            // Verificar se o canal existe e pertence ao usuário
            const channel = await Channel.findById(channelId);
            if (!channel || channel.user_id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal está conectado
            const sessionStatus = SessionManager.getSessionStatus(channelId);
            if (!sessionStatus || sessionStatus.status !== 'connected') {
                return res.status(400).json({
                    success: false,
                    message: 'Canal não está conectado'
                });
            }

            // Normalizar número de telefone
            const normalizedPhone = to.replace(/\D/g, '');
            
            // Buscar ou criar contato
            const contact = await Contact.findOrCreate({
                user_id: req.user.id,
                phone: normalizedPhone
            });

            // Buscar ou criar ticket
            const ticket = await Ticket.findOrCreateForContact({
                user_id: req.user.id,
                contact_id: contact.id,
                channel_id: channelId
            });

            // Enviar mensagem através do SessionManager
            const result = await SessionManager.sendMessage(channelId, normalizedPhone, message);
            
            if (result.success) {
                // Salvar mensagem no banco
                const messageData = {
                    ticket_id: ticket.id,
                    contact_id: contact.id,
                    user_id: req.user.id,
                    channel_id: channelId,
                    message_id: result.messageId,
                    type: 'text',
                    content: message,
                    status: 'sent',
                    is_from_me: true,
                    timestamp: new Date(result.timestamp || Date.now())
                };

                const savedMessage = await Message.create(messageData);
                
                // Atualizar timestamp do contato
                await Contact.updateLastMessage(contact.id);
                
                logger.info(`Mensagem enviada: ${channelId} -> ${normalizedPhone}`);
                
                res.json({
                    success: true,
                    message: 'Mensagem enviada com sucesso',
                    data: {
                        message: savedMessage.toJSON(),
                        messageId: result.messageId
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message || 'Erro ao enviar mensagem'
                });
            }
        } catch (error) {
            logger.error(`Erro ao enviar mensagem: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Enviar mensagem com mídia
    static sendMediaMessage = [upload.single('media'), asyncHandler(async (req, res) => {
        const { channelId, to, caption } = req.body;
        const mediaFile = req.file;

        // Validar dados obrigatórios
        if (!channelId || !to || !mediaFile) {
            return res.status(400).json({
                success: false,
                message: 'Canal, destinatário e arquivo de mídia são obrigatórios'
            });
        }

        try {
            // Verificar se o canal existe e pertence ao usuário
            const channel = await Channel.findById(channelId);
            if (!channel || channel.user_id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal está conectado
            const sessionStatus = SessionManager.getSessionStatus(channelId);
            if (!sessionStatus || sessionStatus.status !== 'connected') {
                return res.status(400).json({
                    success: false,
                    message: 'Canal não está conectado'
                });
            }

            // Normalizar número de telefone
            const normalizedPhone = to.replace(/\D/g, '');
            
            // Buscar ou criar contato
            const contact = await Contact.findOrCreate({
                user_id: req.user.id,
                phone: normalizedPhone
            });

            // Buscar ou criar ticket
            const ticket = await Ticket.findOrCreateForContact({
                user_id: req.user.id,
                contact_id: contact.id,
                channel_id: channelId
            });

            // Enviar mídia através do SessionManager
            const result = await SessionManager.sendMedia(channelId, normalizedPhone, mediaFile.path, caption);
            
            if (result.success) {
                // Determinar tipo de mídia
                let mediaType = 'document';
                if (mediaFile.mimetype.startsWith('image/')) {
                    mediaType = 'image';
                } else if (mediaFile.mimetype.startsWith('video/')) {
                    mediaType = 'video';
                } else if (mediaFile.mimetype.startsWith('audio/')) {
                    mediaType = 'audio';
                }

                // Salvar mensagem no banco
                const messageData = {
                    ticket_id: ticket.id,
                    contact_id: contact.id,
                    user_id: req.user.id,
                    channel_id: channelId,
                    message_id: result.messageId,
                    type: mediaType,
                    content: caption || '',
                    media_url: `/uploads/${mediaFile.filename}`,
                    media_type: mediaFile.mimetype,
                    status: 'sent',
                    is_from_me: true,
                    timestamp: new Date(result.timestamp || Date.now())
                };

                const savedMessage = await Message.create(messageData);
                
                // Atualizar timestamp do contato
                await Contact.updateLastMessage(contact.id);
                
                logger.info(`Mídia enviada: ${channelId} -> ${normalizedPhone} (${mediaType})`);
                
                res.json({
                    success: true,
                    message: 'Mídia enviada com sucesso',
                    data: {
                        message: savedMessage.toJSON(),
                        messageId: result.messageId
                    }
                });
            } else {
                // Remover arquivo se o envio falhou
                try {
                    await fs.unlink(mediaFile.path);
                } catch (unlinkError) {
                    logger.error(`Erro ao remover arquivo: ${unlinkError.message}`);
                }
                
                res.status(500).json({
                    success: false,
                    message: result.message || 'Erro ao enviar mídia'
                });
            }
        } catch (error) {
            // Remover arquivo em caso de erro
            if (mediaFile && mediaFile.path) {
                try {
                    await fs.unlink(mediaFile.path);
                } catch (unlinkError) {
                    logger.error(`Erro ao remover arquivo: ${unlinkError.message}`);
                }
            }
            
            logger.error(`Erro ao enviar mídia: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    })];

    // Listar mensagens de um ticket
    static getMessages = asyncHandler(async (req, res) => {
        const { ticketId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        try {
            // Verificar se o ticket existe e pertence ao usuário
            const ticket = await Ticket.findById(ticketId);
            if (!ticket || ticket.user_id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket não encontrado'
                });
            }

            // Buscar mensagens do ticket
            const messages = await Message.findByTicketId(ticketId, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: {
                    messages: messages.map(msg => msg.toJSON()),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            logger.error(`Erro ao listar mensagens: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Buscar mensagens
    static searchMessages = asyncHandler(async (req, res) => {
        const { query, channelId, contactId, startDate, endDate, page = 1, limit = 50 } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Termo de busca é obrigatório'
            });
        }

        try {
            const searchParams = {
                userId: req.user.id,
                query,
                channelId,
                contactId,
                startDate,
                endDate,
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const messages = await Message.search(searchParams);

            res.json({
                success: true,
                data: {
                    messages: messages.map(msg => msg.toJSON()),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            logger.error(`Erro ao buscar mensagens: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Obter estatísticas de mensagens
    static getMessageStats = asyncHandler(async (req, res) => {
        const { channelId, period = '7d' } = req.query;

        try {
            const stats = await Message.getStats({
                userId: req.user.id,
                channelId,
                period
            });

            res.json({
                success: true,
                data: {
                    stats
                }
            });
        } catch (error) {
            logger.error(`Erro ao obter estatísticas: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Marcar mensagem como lida
    static markAsRead = asyncHandler(async (req, res) => {
        const { messageId } = req.params;

        try {
            const message = await Message.findById(messageId);
            if (!message || message.user_id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Mensagem não encontrada'
                });
            }

            await Message.updateStatus(messageId, 'read');

            res.json({
                success: true,
                message: 'Mensagem marcada como lida'
            });
        } catch (error) {
            logger.error(`Erro ao marcar mensagem como lida: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Envio em massa
    static sendBulkMessages = asyncHandler(async (req, res) => {
        const { channelId, contacts, message, delay = 1000 } = req.body;

        // Validar dados obrigatórios
        if (!channelId || !contacts || !Array.isArray(contacts) || !message) {
            return res.status(400).json({
                success: false,
                message: 'Canal, lista de contatos e mensagem são obrigatórios'
            });
        }

        if (contacts.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Máximo de 100 contatos por envio'
            });
        }

        try {
            // Verificar se o canal existe e pertence ao usuário
            const channel = await Channel.findById(channelId);
            if (!channel || channel.user_id !== req.user.id) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal está conectado
            const sessionStatus = SessionManager.getSessionStatus(channelId);
            if (!sessionStatus || sessionStatus.status !== 'connected') {
                return res.status(400).json({
                    success: false,
                    message: 'Canal não está conectado'
                });
            }

            const results = [];
            
            // Enviar mensagens com delay
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                
                try {
                    // Normalizar número
                    const normalizedPhone = contact.phone.replace(/\D/g, '');
                    
                    // Personalizar mensagem se necessário
                    let personalizedMessage = message;
                    if (contact.name) {
                        personalizedMessage = message.replace(/{{nome}}/g, contact.name);
                        personalizedMessage = personalizedMessage.replace(/{{name}}/g, contact.name);
                    }
                    
                    // Enviar mensagem
                    const result = await SessionManager.sendMessage(channelId, normalizedPhone, personalizedMessage);
                    
                    results.push({
                        phone: normalizedPhone,
                        success: result.success,
                        messageId: result.messageId,
                        error: result.success ? null : result.message
                    });
                    
                    // Delay entre envios
                    if (i < contacts.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                } catch (error) {
                    results.push({
                        phone: contact.phone,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;

            logger.info(`Envio em massa concluído: ${successCount} sucessos, ${failureCount} falhas`);

            res.json({
                success: true,
                message: `Envio concluído: ${successCount} sucessos, ${failureCount} falhas`,
                data: {
                    results,
                    summary: {
                        total: results.length,
                        success: successCount,
                        failure: failureCount
                    }
                }
            });
        } catch (error) {
            logger.error(`Erro no envio em massa: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });
}

export default MessageController;