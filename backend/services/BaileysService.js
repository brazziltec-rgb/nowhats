import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import BaseWhatsAppService from './BaseWhatsAppService.js';
import logger from '../config/logger.js';

class BaileysService extends BaseWhatsAppService {
  constructor(channel, sessionManager) {
    super(channel, sessionManager);
    this.authPath = path.join(process.env.SESSIONS_PATH || './sessions', `baileys_${this.channelId}`);
    this.qrCode = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Start Baileys WhatsApp session
   */
  async start() {
    try {
      this.updateStatus('connecting');
      logger.info(`Starting Baileys session for channel ${this.channelId}`);

      // Ensure auth directory exists
      await fs.mkdir(this.authPath, { recursive: true });

      // Get latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(`Using Baileys version ${version}, isLatest: ${isLatest}`);

      // Load auth state
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

      // Create socket
      this.client = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: {
          level: 'silent'
        },
        browser: ['NoWhats', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true
      });

      // Set up event listeners
      this.setupEventListeners(saveCreds);

      logger.info(`Baileys client created for channel ${this.channelId}`);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Setup event listeners for Baileys client
   */
  setupEventListeners(saveCreds) {
    // Connection updates
    this.client.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          this.qrCode = await QRCode.toDataURL(qr);
          this.handleQRCode(this.qrCode);
          logger.info(`QR code generated for Baileys channel ${this.channelId}`);
        } catch (error) {
          logger.error('Error generating QR code:', error);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        const reason = (lastDisconnect?.error)?.output?.statusCode || 'Unknown';
        
        logger.info(`Baileys connection closed for channel ${this.channelId}. Reason: ${reason}`);
        
        if (shouldReconnect && this.retryCount < this.maxRetries) {
          this.retryCount++;
          logger.info(`Attempting to reconnect Baileys session ${this.retryCount}/${this.maxRetries} for channel ${this.channelId}`);
          setTimeout(() => this.start(), 3000);
        } else {
          this.handleDisconnection(`Connection closed: ${reason}`);
          if (reason === DisconnectReason.loggedOut) {
            // Clear auth state if logged out
            await this.clearAuthState();
          }
        }
      } else if (connection === 'open') {
        this.retryCount = 0;
        this.phoneNumber = this.client.user?.id?.split(':')[0] || null;
        this.profileName = this.client.user?.name || null;
        this.handleConnection();
        logger.info(`Baileys session connected for channel ${this.channelId}`);
      }
    });

    // Save credentials
    this.client.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    this.client.ev.on('messages.upsert', async (messageUpdate) => {
      const { messages, type } = messageUpdate;
      
      if (type === 'notify') {
        for (const message of messages) {
          await this.processIncomingMessage(message);
        }
      }
    });

    // Handle message receipts
    this.client.ev.on('messages.update', (messageUpdates) => {
      for (const update of messageUpdates) {
        if (update.update.status) {
          this.handleMessageAck(update.key.id, update.update.status);
        }
      }
    });

    // Handle presence updates
    this.client.ev.on('presence.update', (presenceUpdate) => {
      logger.debug(`Presence update for ${presenceUpdate.id}:`, presenceUpdate.presences);
    });
  }

  /**
   * Process incoming message
   */
  async processIncomingMessage(message) {
    try {
      if (!message.message) return;

      const messageData = {
        id: message.key.id,
        from: message.key.remoteJid,
        fromMe: message.key.fromMe,
        timestamp: new Date(message.messageTimestamp * 1000),
        type: this.getMessageType(message.message),
        content: this.extractMessageContent(message.message),
        isGroup: message.key.remoteJid?.includes('@g.us') || false,
        participant: message.key.participant || null
      };

      this.handleMessage(messageData);
    } catch (error) {
      logger.error('Error processing incoming message:', error);
    }
  }

  /**
   * Get message type from Baileys message object
   */
  getMessageType(message) {
    if (message.conversation) return 'text';
    if (message.extendedTextMessage) return 'text';
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    if (message.locationMessage) return 'location';
    if (message.contactMessage) return 'contact';
    return 'unknown';
  }

  /**
   * Extract message content from Baileys message object
   */
  extractMessageContent(message) {
    if (message.conversation) {
      return message.conversation;
    }
    if (message.extendedTextMessage) {
      return message.extendedTextMessage.text;
    }
    if (message.imageMessage) {
      return message.imageMessage.caption || '[Image]';
    }
    if (message.videoMessage) {
      return message.videoMessage.caption || '[Video]';
    }
    if (message.audioMessage) {
      return '[Audio]';
    }
    if (message.documentMessage) {
      return message.documentMessage.fileName || '[Document]';
    }
    if (message.stickerMessage) {
      return '[Sticker]';
    }
    if (message.locationMessage) {
      return '[Location]';
    }
    if (message.contactMessage) {
      return `[Contact: ${message.contactMessage.displayName}]`;
    }
    return '[Unknown message type]';
  }

  /**
   * Send text message
   */
  async sendMessage(to, message, options = {}) {
    try {
      this.validateMessage(message);
      
      const jid = this.isGroup(to) ? this.formatGroupId(to) : this.formatPhoneForWhatsApp(to);
      
      const result = await this.client.sendMessage(jid, {
        text: message,
        ...options
      });

      logger.info(`Message sent via Baileys for channel ${this.channelId} to ${to}`);
      return {
        id: result.key.id,
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error sending message via Baileys for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Send media message
   */
  async sendMedia(to, media, options = {}) {
    try {
      const jid = this.isGroup(to) ? this.formatGroupId(to) : this.formatPhoneForWhatsApp(to);
      
      let mediaMessage = {};
      
      if (media.type === 'image') {
        mediaMessage = {
          image: { url: media.url },
          caption: media.caption || ''
        };
      } else if (media.type === 'video') {
        mediaMessage = {
          video: { url: media.url },
          caption: media.caption || ''
        };
      } else if (media.type === 'audio') {
        mediaMessage = {
          audio: { url: media.url },
          mimetype: media.mimetype || 'audio/mp4'
        };
      } else if (media.type === 'document') {
        mediaMessage = {
          document: { url: media.url },
          fileName: media.filename || 'document',
          mimetype: media.mimetype || 'application/octet-stream'
        };
      } else {
        throw new Error(`Unsupported media type: ${media.type}`);
      }

      const result = await this.client.sendMessage(jid, {
        ...mediaMessage,
        ...options
      });

      logger.info(`Media sent via Baileys for channel ${this.channelId} to ${to}`);
      return {
        id: result.key.id,
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error sending media via Baileys for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get contacts
   */
  async getContacts() {
    try {
      const contacts = await this.client.getContacts();
      return contacts.map(contact => ({
        id: contact.id,
        name: contact.name || contact.notify || contact.verifiedName,
        phone: this.extractPhoneNumber(contact.id),
        isGroup: this.isGroup(contact.id)
      }));
    } catch (error) {
      logger.error(`Error getting contacts via Baileys for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get chats
   */
  async getChats() {
    try {
      const chats = await this.client.getChats();
      return chats.map(chat => ({
        id: chat.id,
        name: chat.name,
        isGroup: this.isGroup(chat.id),
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount || 0
      }));
    } catch (error) {
      logger.error(`Error getting chats via Baileys for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Stop Baileys session
   */
  async stop() {
    try {
      if (this.client) {
        await this.client.logout();
        this.client = null;
      }
      
      this.handleDisconnection('Manual stop');
      logger.info(`Baileys session stopped for channel ${this.channelId}`);
    } catch (error) {
      logger.error(`Error stopping Baileys session for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Clear authentication state
   */
  async clearAuthState() {
    try {
      await fs.rm(this.authPath, { recursive: true, force: true });
      logger.info(`Auth state cleared for Baileys channel ${this.channelId}`);
    } catch (error) {
      logger.error(`Error clearing auth state for Baileys channel ${this.channelId}:`, error);
    }
  }

  /**
   * Get current QR code
   */
  getQRCode() {
    return this.qrCode;
  }

  /**
   * Check if client is ready
   */
  isReady() {
    return this.client && this.isConnected;
  }
}

export default BaileysService;