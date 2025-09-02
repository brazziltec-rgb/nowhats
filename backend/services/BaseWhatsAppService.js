import EventEmitter from 'events';
import logger from '../config/logger.js';

/**
 * Base class for WhatsApp API services
 * This class provides common functionality that all WhatsApp services should implement
 */
class BaseWhatsAppService extends EventEmitter {
  constructor(channel, sessionManager) {
    super();
    this.channel = channel;
    this.sessionManager = sessionManager;
    this.channelId = channel.id;
    this.userId = channel.user_id;
    this.api = channel.api;
    this.status = 'disconnected';
    this.isConnected = false;
    this.connectedAt = null;
    this.phoneNumber = null;
    this.profileName = null;
    this.client = null;
  }

  /**
   * Start the WhatsApp session
   * Must be implemented by child classes
   */
  async start() {
    throw new Error('start() method must be implemented by child class');
  }

  /**
   * Stop the WhatsApp session
   * Must be implemented by child classes
   */
  async stop() {
    throw new Error('stop() method must be implemented by child class');
  }

  /**
   * Send text message
   * Must be implemented by child classes
   */
  async sendMessage(to, message, options = {}) {
    throw new Error('sendMessage() method must be implemented by child class');
  }

  /**
   * Send media message
   * Must be implemented by child classes
   */
  async sendMedia(to, media, options = {}) {
    throw new Error('sendMedia() method must be implemented by child class');
  }

  /**
   * Get contacts
   * Must be implemented by child classes
   */
  async getContacts() {
    throw new Error('getContacts() method must be implemented by child class');
  }

  /**
   * Get chats
   * Must be implemented by child classes
   */
  async getChats() {
    throw new Error('getChats() method must be implemented by child class');
  }

  /**
   * Common method to update status
   */
  updateStatus(status) {
    this.status = status;
    logger.info(`Channel ${this.channelId} status updated to: ${status}`);
  }

  /**
   * Common method to handle connection
   */
  handleConnection() {
    this.isConnected = true;
    this.connectedAt = new Date();
    this.updateStatus('connected');
    this.emit('connected');
  }

  /**
   * Common method to handle disconnection
   */
  handleDisconnection(reason = 'Unknown') {
    this.isConnected = false;
    this.connectedAt = null;
    this.updateStatus('disconnected');
    this.emit('disconnected', reason);
  }

  /**
   * Common method to handle QR code
   */
  handleQRCode(qrCode) {
    this.updateStatus('qr_code');
    this.emit('qr', qrCode);
  }

  /**
   * Common method to handle errors
   */
  handleError(error) {
    logger.error(`Error in ${this.api} service for channel ${this.channelId}:`, error);
    this.emit('error', error);
  }

  /**
   * Common method to handle incoming messages
   */
  handleMessage(message) {
    this.emit('message', message);
  }

  /**
   * Common method to handle message acknowledgments
   */
  handleMessageAck(messageId, ack) {
    this.emit('message_ack', messageId, ack);
  }

  /**
   * Normalize phone number format
   */
  normalizePhoneNumber(phone) {
    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming Brazil +55)
    if (normalized.length === 11 && normalized.startsWith('11')) {
      normalized = '55' + normalized;
    } else if (normalized.length === 10) {
      normalized = '5511' + normalized;
    } else if (normalized.length === 13 && normalized.startsWith('55')) {
      // Already has country code
    } else if (!normalized.startsWith('55')) {
      normalized = '55' + normalized;
    }
    
    return normalized;
  }

  /**
   * Format phone number for WhatsApp
   */
  formatPhoneForWhatsApp(phone) {
    const normalized = this.normalizePhoneNumber(phone);
    return normalized + '@s.whatsapp.net';
  }

  /**
   * Format group ID for WhatsApp
   */
  formatGroupId(groupId) {
    if (groupId.includes('@g.us')) {
      return groupId;
    }
    return groupId + '@g.us';
  }

  /**
   * Check if number is a group
   */
  isGroup(id) {
    return id.includes('@g.us');
  }

  /**
   * Extract phone number from WhatsApp ID
   */
  extractPhoneNumber(whatsappId) {
    return whatsappId.split('@')[0];
  }

  /**
   * Validate message content
   */
  validateMessage(message) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message content is required and must be a string');
    }
    
    if (message.length > 4096) {
      throw new Error('Message content is too long (max 4096 characters)');
    }
    
    return true;
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Phone number is required and must be a string');
    }
    
    const normalized = this.normalizePhoneNumber(phone);
    
    if (normalized.length < 10 || normalized.length > 15) {
      throw new Error('Invalid phone number format');
    }
    
    return true;
  }

  /**
   * Get session information
   */
  getInfo() {
    return {
      channelId: this.channelId,
      userId: this.userId,
      api: this.api,
      status: this.status,
      isConnected: this.isConnected,
      connectedAt: this.connectedAt,
      phoneNumber: this.phoneNumber,
      profileName: this.profileName
    };
  }

  /**
   * Common cleanup method
   */
  async cleanup() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
      
      this.removeAllListeners();
      this.handleDisconnection('Cleanup');
      
      logger.info(`Cleanup completed for channel ${this.channelId}`);
    } catch (error) {
      logger.error(`Error during cleanup for channel ${this.channelId}:`, error);
    }
  }

  /**
   * Common method to handle rate limiting
   */
  async handleRateLimit(retryAfter = 1000) {
    logger.warn(`Rate limit hit for channel ${this.channelId}, waiting ${retryAfter}ms`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
  }

  /**
   * Common method to retry operations
   */
  async retry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Operation failed (attempt ${i + 1}/${maxRetries}) for channel ${this.channelId}:`, error.message);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
}

export default BaseWhatsAppService;