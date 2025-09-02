import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';
import SessionManager from '../services/SessionManager.js';
import Message from '../models/Message.js';
import Contact from '../models/Contact.js';
import Ticket from '../models/Ticket.js';
import Channel from '../models/Channel.js';

class WebhookController {
    /**
     * Webhook para receber eventos da API Evolution
     */
    static evolutionWebhook = asyncHandler(async (req, res) => {
        const { event, instance, data } = req.body;
        
        logger.info('Webhook Evolution recebido:', {
            event,
            instance,
            data: JSON.stringify(data).substring(0, 500)
        });

        try {
            // Encontrar o canal pela instância
            const channel = await Channel.findByName(instance);
            if (!channel) {
                logger.warn(`Canal não encontrado para instância: ${instance}`);
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            switch (event) {
                case 'qrcode.updated':
                    await WebhookController.handleQRCodeUpdate(channel, data);
                    break;
                    
                case 'connection.update':
                    await WebhookController.handleConnectionUpdate(channel, data);
                    break;
                    
                case 'messages.upsert':
                    await WebhookController.handleMessageReceived(channel, data);
                    break;
                    
                case 'message.ack':
                    await WebhookController.handleMessageAck(channel, data);
                    break;
                    
                default:
                    logger.info(`Evento não tratado: ${event}`);
            }

            res.json({ success: true, message: 'Webhook processado' });
        } catch (error) {
            logger.error('Erro ao processar webhook Evolution:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    /**
     * Webhook genérico para outras APIs
     */
    static genericWebhook = asyncHandler(async (req, res) => {
        const { channelId } = req.params;
        const webhookData = req.body;
        
        logger.info('Webhook genérico recebido:', {
            channelId,
            data: JSON.stringify(webhookData).substring(0, 500)
        });

        try {
            // Encontrar o canal
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Processar webhook baseado no tipo de API
            switch (channel.api_type) {
                case 'baileys':
                    await WebhookController.processBaileysWebhook(channel, webhookData);
                    break;
                    
                case 'webjs':
                    await WebhookController.processWebJsWebhook(channel, webhookData);
                    break;
                    
                default:
                    logger.warn(`Tipo de API não suportado: ${channel.api_type}`);
            }

            res.json({ success: true, message: 'Webhook processado' });
        } catch (error) {
            logger.error('Erro ao processar webhook genérico:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    /**
     * Processar webhook do Baileys
     */
    static async processBaileysWebhook(channel, data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'connection_update':
                await WebhookController.handleConnectionUpdate(channel, payload);
                break;
                
            case 'message_received':
                await WebhookController.handleMessageReceived(channel, payload);
                break;
                
            case 'message_ack':
                await WebhookController.handleMessageAck(channel, payload);
                break;
                
            default:
                logger.info(`Evento Baileys não tratado: ${type}`);
        }
    }

    /**
     * Processar webhook do Web.js
     */
    static async processWebJsWebhook(channel, data) {
        const { event, payload } = data;
        
        switch (event) {
            case 'ready':
                await WebhookController.handleConnectionUpdate(channel, { state: 'open' });
                break;
                
            case 'message':
                await WebhookController.handleMessageReceived(channel, payload);
                break;
                
            case 'message_ack':
                await WebhookController.handleMessageAck(channel, payload);
                break;
                
            case 'disconnected':
                await WebhookController.handleConnectionUpdate(channel, { state: 'close' });
                break;
                
            default:
                logger.info(`Evento Web.js não tratado: ${event}`);
        }
    }

    /**
     * Tratar atualização de QR Code
     */
    static async handleQRCodeUpdate(channel, data) {
        try {
            const { qr } = data;
            
            if (qr) {
                await Channel.update(channel.id, {
                    qr_code: qr,
                    status: 'connecting',
                    updated_at: new Date()
                });
                
                logger.info(`QR Code atualizado para canal ${channel.id}`);
            }
        } catch (error) {
            logger.error('Erro ao atualizar QR Code:', error);
        }
    }

    /**
     * Tratar atualização de conexão
     */
    static async handleConnectionUpdate(channel, data) {
        try {
            const { state, lastDisconnect } = data;
            let status = 'disconnected';
            
            switch (state) {
                case 'open':
                case 'connected':
                    status = 'connected';
                    break;
                case 'connecting':
                    status = 'connecting';
                    break;
                case 'close':
                case 'closed':
                    status = 'disconnected';
                    break;
            }

            await Channel.update(channel.id, {
                status,
                qr_code: status === 'connected' ? null : channel.qr_code,
                updated_at: new Date()
            });
            
            logger.info(`Status do canal ${channel.id} atualizado para: ${status}`);
            
            // Se desconectado, tentar reconectar automaticamente
            if (status === 'disconnected' && lastDisconnect?.error?.output?.statusCode !== 401) {
                setTimeout(async () => {
                    try {
                        await SessionManager.restartSession(channel.id);
                        logger.info(`Tentativa de reconexão automática para canal ${channel.id}`);
                    } catch (error) {
                        logger.error(`Erro na reconexão automática do canal ${channel.id}:`, error);
                    }
                }, 5000); // Aguardar 5 segundos antes de tentar reconectar
            }
        } catch (error) {
            logger.error('Erro ao atualizar status de conexão:', error);
        }
    }

    /**
     * Tratar mensagem recebida
     */
    static async handleMessageReceived(channel, data) {
        try {
            const messages = Array.isArray(data.messages) ? data.messages : [data];
            
            for (const messageData of messages) {
                await WebhookController.processIncomingMessage(channel, messageData);
            }
        } catch (error) {
            logger.error('Erro ao processar mensagem recebida:', error);
        }
    }

    /**
     * Processar mensagem recebida individual
     */
    static async processIncomingMessage(channel, messageData) {
        try {
            const {
                key,
                message,
                messageTimestamp,
                pushName,
                participant
            } = messageData;

            // Ignorar mensagens próprias
            if (key.fromMe) {
                return;
            }

            const phoneNumber = key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            const isGroup = key.remoteJid.includes('@g.us');
            const senderPhone = participant ? participant.replace('@s.whatsapp.net', '') : phoneNumber;
            
            // Encontrar ou criar contato
            const contact = await Contact.findOrCreate({
                user_id: channel.user_id,
                phone: phoneNumber,
                name: pushName || phoneNumber,
                is_group: isGroup
            });

            // Encontrar ou criar ticket
            const ticket = await Ticket.findOrCreateForContact(contact.id, channel.user_id);

            // Extrair conteúdo da mensagem
            let content = '';
            let mediaUrl = null;
            let mediaType = null;
            let messageType = 'text';

            if (message.conversation) {
                content = message.conversation;
            } else if (message.extendedTextMessage) {
                content = message.extendedTextMessage.text;
            } else if (message.imageMessage) {
                content = message.imageMessage.caption || '[Imagem]';
                messageType = 'image';
                mediaType = 'image';
            } else if (message.videoMessage) {
                content = message.videoMessage.caption || '[Vídeo]';
                messageType = 'video';
                mediaType = 'video';
            } else if (message.audioMessage) {
                content = '[Áudio]';
                messageType = 'audio';
                mediaType = 'audio';
            } else if (message.documentMessage) {
                content = message.documentMessage.fileName || '[Documento]';
                messageType = 'document';
                mediaType = 'document';
            } else {
                content = '[Mensagem não suportada]';
                messageType = 'unknown';
            }

            // Salvar mensagem no banco
            await Message.create({
                ticket_id: ticket.id,
                contact_id: contact.id,
                user_id: channel.user_id,
                channel_id: channel.id,
                message_id: key.id,
                type: messageType,
                content,
                media_url: mediaUrl,
                media_type: mediaType,
                status: 'received',
                is_from_me: false,
                timestamp: new Date(messageTimestamp * 1000)
            });

            // Atualizar timestamp da última mensagem do contato
            await Contact.updateLastMessageAt(contact.id);

            logger.info(`Mensagem recebida processada: ${key.id}`);
        } catch (error) {
            logger.error('Erro ao processar mensagem individual:', error);
        }
    }

    /**
     * Tratar confirmação de mensagem (ACK)
     */
    static async handleMessageAck(channel, data) {
        try {
            const { messageId, ack } = data;
            
            let status = 'sent';
            switch (ack) {
                case 1:
                    status = 'sent';
                    break;
                case 2:
                    status = 'delivered';
                    break;
                case 3:
                    status = 'read';
                    break;
            }

            await Message.updateStatus(messageId, status);
            logger.info(`Status da mensagem ${messageId} atualizado para: ${status}`);
        } catch (error) {
            logger.error('Erro ao atualizar ACK da mensagem:', error);
        }
    }

    /**
     * Webhook de teste
     */
    static testWebhook = asyncHandler(async (req, res) => {
        logger.info('Webhook de teste recebido:', req.body);
        
        res.json({
            success: true,
            message: 'Webhook de teste recebido com sucesso',
            timestamp: new Date().toISOString(),
            data: req.body
        });
    });
}

export default WebhookController;