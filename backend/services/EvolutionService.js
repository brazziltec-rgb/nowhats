import axios from 'axios';
import BaseWhatsAppService from './BaseWhatsAppService.js';
import logger from '../config/logger.js';

class EvolutionService extends BaseWhatsAppService {
  constructor(channel, sessionManager) {
    super(channel, sessionManager);
    this.apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instanceName = `instance_${this.channelId}`;
    this.webhookUrl = `${process.env.APP_URL || 'http://localhost:3000'}/webhooks/evolution/${this.channelId}`;
    this.qrCode = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.pollInterval = null;
    
    // Setup axios instance
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      },
      timeout: 30000
    });
  }

  /**
   * Start Evolution API WhatsApp session
   */
  async start() {
    try {
      this.updateStatus('connecting');
      logger.info(`Starting Evolution API session for channel ${this.channelId}`);

      // Check if instance already exists
      const existingInstance = await this.getInstance();
      
      if (existingInstance) {
        logger.info(`Evolution instance already exists for channel ${this.channelId}`);
        await this.connectExistingInstance();
      } else {
        await this.createInstance();
      }

      // Start polling for connection status
      this.startStatusPolling();

      logger.info(`Evolution API session started for channel ${this.channelId}`);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Create new Evolution API instance
   */
  async createInstance() {
    try {
      const instanceData = {
        instanceName: this.instanceName,
        token: this.apiKey,
        qrcode: true,
        webhook: this.webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ]
      };

      const response = await this.api.post('/instance/create', instanceData);
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to create Evolution instance');
      }

      logger.info(`Evolution instance created for channel ${this.channelId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error creating Evolution instance for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get existing instance
   */
  async getInstance() {
    try {
      const response = await this.api.get(`/instance/fetchInstances`);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data.find(instance => instance.instance.instanceName === this.instanceName);
      }
      
      return null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`Error getting Evolution instance for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Connect to existing instance
   */
  async connectExistingInstance() {
    try {
      const response = await this.api.get(`/instance/connect/${this.instanceName}`);
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to connect to Evolution instance');
      }

      logger.info(`Connected to existing Evolution instance for channel ${this.channelId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error connecting to Evolution instance for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Start polling for connection status
   */
  startStatusPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(async () => {
      try {
        await this.checkConnectionStatus();
      } catch (error) {
        logger.error(`Error polling connection status for channel ${this.channelId}:`, error);
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Stop status polling
   */
  stopStatusPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Check connection status
   */
  async checkConnectionStatus() {
    try {
      const response = await this.api.get(`/instance/connectionState/${this.instanceName}`);
      
      if (response.data) {
        const { state } = response.data.instance;
        
        switch (state) {
          case 'open':
            if (!this.isConnected) {
              this.phoneNumber = response.data.instance.owner || null;
              this.profileName = response.data.instance.profileName || null;
              this.handleConnection();
              this.stopStatusPolling();
            }
            break;
            
          case 'connecting':
            this.updateStatus('connecting');
            break;
            
          case 'close':
            if (this.isConnected) {
              this.handleDisconnection('Connection closed');
            }
            break;
            
          default:
            logger.debug(`Unknown connection state for channel ${this.channelId}: ${state}`);
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        logger.error(`Error checking connection status for channel ${this.channelId}:`, error);
      }
    }
  }

  /**
   * Get QR Code
   */
  async getQRCode() {
    try {
      const response = await this.api.get(`/instance/qrcode/${this.instanceName}`);
      
      if (response.data && response.data.qrcode) {
        this.qrCode = response.data.qrcode.base64;
        this.handleQRCode(this.qrCode);
        return this.qrCode;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting QR code for channel ${this.channelId}:`, error);
      return null;
    }
  }

  /**
   * Send text message
   */
  async sendMessage(to, message, options = {}) {
    try {
      this.validateMessage(message);
      
      const number = this.isGroup(to) ? to : this.normalizePhoneNumber(to);
      
      const messageData = {
        number: number,
        text: message,
        ...options
      };

      const response = await this.api.post(`/message/sendText/${this.instanceName}`, messageData);
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to send message');
      }

      logger.info(`Message sent via Evolution API for channel ${this.channelId} to ${to}`);
      return {
        id: response.data.key?.id || null,
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error sending message via Evolution API for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Send media message
   */
  async sendMedia(to, media, options = {}) {
    try {
      const number = this.isGroup(to) ? to : this.normalizePhoneNumber(to);
      
      let endpoint = '';
      let mediaData = {
        number: number,
        ...options
      };

      switch (media.type) {
        case 'image':
          endpoint = 'sendMedia';
          mediaData.mediatype = 'image';
          mediaData.media = media.url;
          mediaData.caption = media.caption || '';
          break;
          
        case 'video':
          endpoint = 'sendMedia';
          mediaData.mediatype = 'video';
          mediaData.media = media.url;
          mediaData.caption = media.caption || '';
          break;
          
        case 'audio':
          endpoint = 'sendWhatsAppAudio';
          mediaData.audio = media.url;
          break;
          
        case 'document':
          endpoint = 'sendMedia';
          mediaData.mediatype = 'document';
          mediaData.media = media.url;
          mediaData.fileName = media.filename || 'document';
          break;
          
        default:
          throw new Error(`Unsupported media type: ${media.type}`);
      }

      const response = await this.api.post(`/message/${endpoint}/${this.instanceName}`, mediaData);
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to send media');
      }

      logger.info(`Media sent via Evolution API for channel ${this.channelId} to ${to}`);
      return {
        id: response.data.key?.id || null,
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error sending media via Evolution API for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get contacts
   */
  async getContacts() {
    try {
      const response = await this.api.get(`/chat/fetchContacts/${this.instanceName}`);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(contact => ({
          id: contact.id,
          name: contact.name || contact.pushName || contact.verifiedName,
          phone: this.extractPhoneNumber(contact.id),
          isGroup: this.isGroup(contact.id)
        }));
      }
      
      return [];
    } catch (error) {
      logger.error(`Error getting contacts via Evolution API for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Get chats
   */
  async getChats() {
    try {
      const response = await this.api.get(`/chat/fetchChats/${this.instanceName}`);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(chat => ({
          id: chat.id,
          name: chat.name,
          isGroup: this.isGroup(chat.id),
          lastMessageTime: chat.lastMessageTime,
          unreadCount: chat.unreadCount || 0
        }));
      }
      
      return [];
    } catch (error) {
      logger.error(`Error getting chats via Evolution API for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Process webhook data
   */
  processWebhook(data) {
    try {
      const { event, instance, data: eventData } = data;
      
      if (instance !== this.instanceName) {
        return; // Not for this instance
      }

      switch (event) {
        case 'qrcode.updated':
          if (eventData.qrcode) {
            this.qrCode = eventData.qrcode;
            this.handleQRCode(this.qrCode);
          }
          break;
          
        case 'connection.update':
          this.handleConnectionUpdate(eventData);
          break;
          
        case 'messages.upsert':
          if (eventData.messages) {
            eventData.messages.forEach(message => {
              this.processIncomingMessage(message);
            });
          }
          break;
          
        case 'messages.update':
          if (eventData.messages) {
            eventData.messages.forEach(update => {
              if (update.update?.status) {
                this.handleMessageAck(update.key.id, update.update.status);
              }
            });
          }
          break;
      }
    } catch (error) {
      logger.error(`Error processing webhook for channel ${this.channelId}:`, error);
    }
  }

  /**
   * Handle connection update from webhook
   */
  handleConnectionUpdate(data) {
    const { state } = data;
    
    switch (state) {
      case 'open':
        if (!this.isConnected) {
          this.phoneNumber = data.user?.id || null;
          this.profileName = data.user?.name || null;
          this.handleConnection();
        }
        break;
        
      case 'close':
        if (this.isConnected) {
          this.handleDisconnection('Connection closed');
        }
        break;
    }
  }

  /**
   * Process incoming message from webhook
   */
  processIncomingMessage(message) {
    try {
      if (!message.message || message.key.fromMe) return;

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
      logger.error('Error processing incoming message from webhook:', error);
    }
  }

  /**
   * Get message type from Evolution message object
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
   * Extract message content from Evolution message object
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
   * Stop Evolution API session
   */
  async stop() {
    try {
      this.stopStatusPolling();
      
      // Delete instance
      await this.api.delete(`/instance/delete/${this.instanceName}`);
      
      this.handleDisconnection('Manual stop');
      logger.info(`Evolution API session stopped for channel ${this.channelId}`);
    } catch (error) {
      logger.error(`Error stopping Evolution API session for channel ${this.channelId}:`, error);
      throw error;
    }
  }

  /**
   * Check if client is ready
   */
  isReady() {
    return this.isConnected;
  }
}

export default EvolutionService;