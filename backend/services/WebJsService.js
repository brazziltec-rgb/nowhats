const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const BaseWhatsAppService = require('./BaseWhatsAppService');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

class WebJsService extends BaseWhatsAppService {
    constructor(channelId, userId) {
        super(channelId, userId, 'webjs');
        this.client = null;
        this.sessionPath = path.join(__dirname, '../sessions', `webjs_${channelId}`);
        this.isReady = false;
        this.qrCode = null;
    }

    async startSession() {
        try {
            logger.info(`Iniciando sessão Web.js para canal ${this.channelId}`);

            // Criar diretório de sessão se não existir
            await this.ensureSessionDirectory();

            // Configurar cliente Web.js
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `webjs_${this.channelId}`,
                    dataPath: this.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
                }
            });

            // Configurar event listeners
            this.setupEventListeners();

            // Inicializar cliente
            await this.client.initialize();

            this.status = 'connecting';
            await this.updateChannelStatus('connecting');

            return { success: true, message: 'Sessão Web.js iniciada' };
        } catch (error) {
            logger.error(`Erro ao iniciar sessão Web.js: ${error.message}`);
            this.status = 'error';
            await this.updateChannelStatus('error');
            throw error;
        }
    }

    async stopSession() {
        try {
            logger.info(`Parando sessão Web.js para canal ${this.channelId}`);

            if (this.client) {
                await this.client.destroy();
                this.client = null;
            }

            this.isReady = false;
            this.qrCode = null;
            this.status = 'disconnected';
            await this.updateChannelStatus('disconnected');

            return { success: true, message: 'Sessão Web.js parada' };
        } catch (error) {
            logger.error(`Erro ao parar sessão Web.js: ${error.message}`);
            throw error;
        }
    }

    setupEventListeners() {
        // QR Code gerado
        this.client.on('qr', async (qr) => {
            try {
                logger.info(`QR Code gerado para canal ${this.channelId}`);
                this.qrCode = qr;
                
                // Mostrar QR no terminal (desenvolvimento)
                if (process.env.NODE_ENV === 'development') {
                    qrcode.generate(qr, { small: true });
                }

                await this.handleQRCode(qr);
            } catch (error) {
                logger.error(`Erro ao processar QR Code: ${error.message}`);
            }
        });

        // Cliente pronto
        this.client.on('ready', async () => {
            try {
                logger.info(`Cliente Web.js pronto para canal ${this.channelId}`);
                this.isReady = true;
                this.status = 'connected';
                this.qrCode = null;
                
                await this.handleConnection();
            } catch (error) {
                logger.error(`Erro ao processar conexão: ${error.message}`);
            }
        });

        // Cliente autenticado
        this.client.on('authenticated', async () => {
            try {
                logger.info(`Cliente Web.js autenticado para canal ${this.channelId}`);
                await this.updateChannelStatus('authenticated');
            } catch (error) {
                logger.error(`Erro ao processar autenticação: ${error.message}`);
            }
        });

        // Falha na autenticação
        this.client.on('auth_failure', async (msg) => {
            try {
                logger.error(`Falha na autenticação Web.js para canal ${this.channelId}: ${msg}`);
                this.status = 'auth_failure';
                await this.handleAuthFailure(msg);
            } catch (error) {
                logger.error(`Erro ao processar falha de autenticação: ${error.message}`);
            }
        });

        // Cliente desconectado
        this.client.on('disconnected', async (reason) => {
            try {
                logger.warn(`Cliente Web.js desconectado para canal ${this.channelId}: ${reason}`);
                this.isReady = false;
                this.status = 'disconnected';
                await this.handleDisconnection(reason);
            } catch (error) {
                logger.error(`Erro ao processar desconexão: ${error.message}`);
            }
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message);
            } catch (error) {
                logger.error(`Erro ao processar mensagem recebida: ${error.message}`);
            }
        });

        // Confirmação de mensagem
        this.client.on('message_ack', async (message, ack) => {
            try {
                await this.handleMessageAck(message, ack);
            } catch (error) {
                logger.error(`Erro ao processar confirmação de mensagem: ${error.message}`);
            }
        });

        // Erro do cliente
        this.client.on('error', async (error) => {
            try {
                logger.error(`Erro no cliente Web.js para canal ${this.channelId}: ${error.message}`);
                await this.handleError(error);
            } catch (err) {
                logger.error(`Erro ao processar erro do cliente: ${err.message}`);
            }
        });
    }

    async sendTextMessage(to, message) {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('Cliente Web.js não está pronto');
            }

            const formattedNumber = this.formatPhoneNumber(to);
            const chatId = `${formattedNumber}@c.us`;

            const sentMessage = await this.client.sendMessage(chatId, message);

            return {
                success: true,
                messageId: sentMessage.id.id,
                timestamp: sentMessage.timestamp
            };
        } catch (error) {
            logger.error(`Erro ao enviar mensagem de texto Web.js: ${error.message}`);
            throw error;
        }
    }

    async sendMediaMessage(to, mediaPath, caption = '') {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('Cliente Web.js não está pronto');
            }

            const formattedNumber = this.formatPhoneNumber(to);
            const chatId = `${formattedNumber}@c.us`;

            // Criar MessageMedia do arquivo
            const media = MessageMedia.fromFilePath(mediaPath);
            
            const sentMessage = await this.client.sendMessage(chatId, media, {
                caption: caption
            });

            return {
                success: true,
                messageId: sentMessage.id.id,
                timestamp: sentMessage.timestamp
            };
        } catch (error) {
            logger.error(`Erro ao enviar mídia Web.js: ${error.message}`);
            throw error;
        }
    }

    async getContacts() {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('Cliente Web.js não está pronto');
            }

            const contacts = await this.client.getContacts();
            
            return contacts.map(contact => ({
                id: contact.id._serialized,
                name: contact.name || contact.pushname || contact.number,
                number: contact.number,
                isGroup: contact.isGroup,
                profilePicUrl: contact.profilePicUrl
            }));
        } catch (error) {
            logger.error(`Erro ao obter contatos Web.js: ${error.message}`);
            throw error;
        }
    }

    async getChats() {
        try {
            if (!this.isReady || !this.client) {
                throw new Error('Cliente Web.js não está pronto');
            }

            const chats = await this.client.getChats();
            
            return chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                lastMessage: chat.lastMessage ? {
                    body: chat.lastMessage.body,
                    timestamp: chat.lastMessage.timestamp,
                    from: chat.lastMessage.from
                } : null
            }));
        } catch (error) {
            logger.error(`Erro ao obter chats Web.js: ${error.message}`);
            throw error;
        }
    }

    async ensureSessionDirectory() {
        try {
            await fs.mkdir(this.sessionPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async handleIncomingMessage(message) {
        try {
            // Ignorar mensagens próprias
            if (message.fromMe) {
                return;
            }

            const messageData = {
                messageId: message.id.id,
                from: message.from,
                to: message.to,
                body: message.body,
                type: message.type,
                timestamp: message.timestamp,
                isGroup: message.from.includes('@g.us'),
                hasMedia: message.hasMedia
            };

            // Processar mídia se presente
            if (message.hasMedia) {
                try {
                    const media = await message.downloadMedia();
                    messageData.media = {
                        mimetype: media.mimetype,
                        data: media.data,
                        filename: media.filename
                    };
                } catch (error) {
                    logger.error(`Erro ao baixar mídia: ${error.message}`);
                }
            }

            await this.processIncomingMessage(messageData);
        } catch (error) {
            logger.error(`Erro ao processar mensagem recebida Web.js: ${error.message}`);
        }
    }

    async handleMessageAck(message, ack) {
        try {
            const ackStatus = {
                0: 'error',
                1: 'pending',
                2: 'sent',
                3: 'received',
                4: 'read',
                5: 'played'
            };

            const status = ackStatus[ack] || 'unknown';

            await this.processMessageAck({
                messageId: message.id.id,
                status: status,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error(`Erro ao processar confirmação de mensagem Web.js: ${error.message}`);
        }
    }

    getQRCode() {
        return this.qrCode;
    }

    getStatus() {
        return {
            status: this.status,
            isReady: this.isReady,
            hasQRCode: !!this.qrCode
        };
    }

    async getSessionInfo() {
        try {
            if (!this.isReady || !this.client) {
                return null;
            }

            const info = this.client.info;
            return {
                wid: info.wid._serialized,
                pushname: info.pushname,
                platform: info.platform,
                battery: info.battery,
                plugged: info.plugged
            };
        } catch (error) {
            logger.error(`Erro ao obter informações da sessão Web.js: ${error.message}`);
            return null;
        }
    }

    async cleanup() {
        try {
            await this.stopSession();
            
            // Limpar arquivos de sessão se necessário
            if (process.env.CLEAR_SESSIONS_ON_CLEANUP === 'true') {
                await this.clearSessionFiles();
            }
        } catch (error) {
            logger.error(`Erro na limpeza Web.js: ${error.message}`);
        }
    }

    async clearSessionFiles() {
        try {
            const { rimraf } = require('rimraf');
            await rimraf(this.sessionPath);
            logger.info(`Arquivos de sessão Web.js limpos para canal ${this.channelId}`);
        } catch (error) {
            logger.error(`Erro ao limpar arquivos de sessão Web.js: ${error.message}`);
        }
    }
}

module.exports = WebJsService;