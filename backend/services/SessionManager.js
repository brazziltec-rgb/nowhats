import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger.js';
import Channel from '../models/Channel.js';

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map(); // Map<channelId, sessionInstance>
    this.sessionTypes = {
      BAILEYS: 'baileys',
      EVOLUTION: 'evolution',
      WEBJS: 'whatsapp-web.js'
    };
    this.sessionsPath = process.env.SESSIONS_PATH || './sessions';
    this.init();
  }

  async init() {
    try {
      // Ensure sessions directory exists
      await fs.mkdir(this.sessionsPath, { recursive: true });
      logger.info('SessionManager initialized');
    } catch (error) {
      logger.error('Error initializing SessionManager:', error);
    }
  }

  // Get session by channel ID
  getSession(channelId) {
    return this.sessions.get(channelId);
  }

  // Check if session exists and is connected
  isSessionConnected(channelId) {
    const session = this.sessions.get(channelId);
    return session && session.isConnected;
  }

  // Get all active sessions
  getActiveSessions() {
    const activeSessions = [];
    for (const [channelId, session] of this.sessions.entries()) {
      if (session.isConnected) {
        activeSessions.push({
          channelId,
          api: session.api,
          status: session.status,
          connectedAt: session.connectedAt
        });
      }
    }
    return activeSessions;
  }

  // Create new session based on API type
  async createSession(channel) {
    try {
      const { id: channelId, api, user_id } = channel;
      
      // Check if session already exists
      if (this.sessions.has(channelId)) {
        logger.warn(`Session already exists for channel ${channelId}`);
        return this.sessions.get(channelId);
      }

      let sessionInstance;
      
      switch (api) {
        case this.sessionTypes.BAILEYS:
          const BaileysService = (await import('./BaileysService.js')).default;
          sessionInstance = new BaileysService(channel, this);
          break;
          
        case this.sessionTypes.EVOLUTION:
          const EvolutionService = (await import('./EvolutionService.js')).default;
          sessionInstance = new EvolutionService(channel, this);
          break;
          
        case this.sessionTypes.WEBJS:
          const WebJSService = (await import('./WebJsService.js')).default;
          sessionInstance = new WebJSService(channel, this);
          break;
          
        default:
          throw new Error(`Unsupported API type: ${api}`);
      }

      // Store session
      this.sessions.set(channelId, sessionInstance);
      
      // Set up event listeners
      this.setupSessionEvents(channelId, sessionInstance);
      
      logger.info(`Session created for channel ${channelId} with API ${api}`);
      return sessionInstance;
    } catch (error) {
      logger.error(`Error creating session for channel ${channel.id}:`, error);
      throw error;
    }
  }

  // Setup event listeners for session
  setupSessionEvents(channelId, session) {
    session.on('qr', (qrCode) => {
      this.emit('qr', { channelId, qrCode });
      logger.info(`QR code generated for channel ${channelId}`);
    });

    session.on('connected', async () => {
      try {
        await Channel.updateStatus(channelId, 'connected');
        this.emit('connected', { channelId });
        logger.info(`Session connected for channel ${channelId}`);
      } catch (error) {
        logger.error(`Error updating channel status to connected:`, error);
      }
    });

    session.on('disconnected', async (reason) => {
      try {
        await Channel.updateStatus(channelId, 'disconnected');
        this.emit('disconnected', { channelId, reason });
        logger.info(`Session disconnected for channel ${channelId}:`, reason);
      } catch (error) {
        logger.error(`Error updating channel status to disconnected:`, error);
      }
    });

    session.on('message', (message) => {
      this.emit('message', { channelId, message });
    });

    session.on('message_ack', (messageId, ack) => {
      this.emit('message_ack', { channelId, messageId, ack });
    });

    session.on('error', (error) => {
      this.emit('error', { channelId, error });
      logger.error(`Session error for channel ${channelId}:`, error);
    });
  }

  // Start session (connect to WhatsApp)
  async startSession(channelId) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        throw new Error(`Session not found for channel ${channelId}`);
      }

      if (session.isConnected) {
        logger.warn(`Session already connected for channel ${channelId}`);
        return session;
      }

      await session.start();
      logger.info(`Session started for channel ${channelId}`);
      return session;
    } catch (error) {
      logger.error(`Error starting session for channel ${channelId}:`, error);
      throw error;
    }
  }

  // Stop session
  async stopSession(channelId) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        logger.warn(`Session not found for channel ${channelId}`);
        return;
      }

      await session.stop();
      this.sessions.delete(channelId);
      
      // Update channel status
      await Channel.updateStatus(channelId, 'disconnected');
      
      logger.info(`Session stopped for channel ${channelId}`);
    } catch (error) {
      logger.error(`Error stopping session for channel ${channelId}:`, error);
      throw error;
    }
  }

  // Restart session
  async restartSession(channelId) {
    try {
      await this.stopSession(channelId);
      
      // Get channel data
      const channel = await Channel.findById(channelId);
      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      // Create and start new session
      const session = await this.createSession(channel);
      await this.startSession(channelId);
      
      logger.info(`Session restarted for channel ${channelId}`);
      return session;
    } catch (error) {
      logger.error(`Error restarting session for channel ${channelId}:`, error);
      throw error;
    }
  }

  // Send message through session
  async sendMessage(channelId, to, message, options = {}) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        throw new Error(`Session not found for channel ${channelId}`);
      }

      if (!session.isConnected) {
        throw new Error(`Session not connected for channel ${channelId}`);
      }

      return await session.sendMessage(to, message, options);
    } catch (error) {
      logger.error(`Error sending message through channel ${channelId}:`, error);
      throw error;
    }
  }

  // Send media through session
  async sendMedia(channelId, to, media, options = {}) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        throw new Error(`Session not found for channel ${channelId}`);
      }

      if (!session.isConnected) {
        throw new Error(`Session not connected for channel ${channelId}`);
      }

      return await session.sendMedia(to, media, options);
    } catch (error) {
      logger.error(`Error sending media through channel ${channelId}:`, error);
      throw error;
    }
  }

  // Get session info
  async getSessionInfo(channelId) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        return null;
      }

      return {
        channelId,
        api: session.api,
        status: session.status,
        isConnected: session.isConnected,
        connectedAt: session.connectedAt,
        phoneNumber: session.phoneNumber,
        profileName: session.profileName
      };
    } catch (error) {
      logger.error(`Error getting session info for channel ${channelId}:`, error);
      throw error;
    }
  }

  // Load existing sessions on startup
  async loadExistingSessions() {
    try {
      const channels = await Channel.findConnected();
      
      for (const channel of channels) {
        try {
          const session = await this.createSession(channel);
          await this.startSession(channel.id);
          logger.info(`Loaded existing session for channel ${channel.id}`);
        } catch (error) {
          logger.error(`Error loading session for channel ${channel.id}:`, error);
          // Update channel status to disconnected if failed to load
          await Channel.updateStatus(channel.id, 'disconnected');
        }
      }
    } catch (error) {
      logger.error('Error loading existing sessions:', error);
    }
  }

  // Clean up sessions on shutdown
  async cleanup() {
    try {
      logger.info('Cleaning up sessions...');
      
      const promises = [];
      for (const [channelId] of this.sessions) {
        promises.push(this.stopSession(channelId));
      }
      
      await Promise.all(promises);
      logger.info('All sessions cleaned up');
    } catch (error) {
      logger.error('Error during session cleanup:', error);
    }
  }

  // Get QR Code from session
  async getQRCode(channelId) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        return null;
      }

      return session.getQRCode ? session.getQRCode() : null;
    } catch (error) {
      logger.error(`Error getting QR code for channel ${channelId}:`, error);
      return null;
    }
  }

  // Get session status
  getSessionStatus(channelId) {
    try {
      const session = this.sessions.get(channelId);
      
      if (!session) {
        return { status: 'not_found', isConnected: false };
      }

      return {
        status: session.status || 'unknown',
        isConnected: session.isConnected || false,
        hasQRCode: session.getQRCode ? !!session.getQRCode() : false
      };
    } catch (error) {
      logger.error(`Error getting session status for channel ${channelId}:`, error);
      return { status: 'error', isConnected: false };
    }
  }

  // Get session statistics
  getStats() {
    const stats = {
      total: this.sessions.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      byApi: {
        baileys: 0,
        evolution: 0,
        webjs: 0
      }
    };

    for (const [, session] of this.sessions) {
      if (session.isConnected) {
        stats.connected++;
      } else if (session.status === 'connecting') {
        stats.connecting++;
      } else {
        stats.disconnected++;
      }

      if (session.api === this.sessionTypes.BAILEYS) {
        stats.byApi.baileys++;
      } else if (session.api === this.sessionTypes.EVOLUTION) {
        stats.byApi.evolution++;
      } else if (session.api === this.sessionTypes.WEBJS) {
        stats.byApi.webjs++;
      }
    }

    return stats;
  }
}

// Create singleton instance
// Adicionar método estático initialize para compatibilidade
class SessionManagerSingleton extends SessionManager {
  static async initialize() {
    if (!this.instance) {
      this.instance = new SessionManagerSingleton();
      await this.instance.init();
    }
    return this.instance;
  }

  static getInstance() {
    return this.instance;
  }
}

export default SessionManagerSingleton;