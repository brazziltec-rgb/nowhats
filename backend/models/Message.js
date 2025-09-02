import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

class Message {
  constructor(data) {
    this.id = data.id;
    this.ticket_id = data.ticket_id;
    this.contact_id = data.contact_id;
    this.user_id = data.user_id;
    this.channel_id = data.channel_id;
    this.message_id = data.message_id;
    this.type = data.type;
    this.content = data.content;
    this.media_url = data.media_url;
    this.media_type = data.media_type;
    this.status = data.status;
    this.is_from_me = data.is_from_me;
    this.timestamp = data.timestamp;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new message
  static async create(messageData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO messages (
          id, ticket_id, contact_id, user_id, channel_id, message_id, 
          type, content, media_url, media_type, status, is_from_me, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        id,
        messageData.ticket_id || null,
        messageData.contact_id,
        messageData.user_id,
        messageData.channel_id,
        messageData.message_id,
        messageData.type || 'text',
        messageData.content,
        messageData.media_url || null,
        messageData.media_type || null,
        messageData.status || 'sent',
        messageData.is_from_me || false,
        messageData.timestamp || new Date()
      ];
      
      const result = await pool.query(query, values);
      return new Message(result.rows[0]);
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  // Find message by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM messages WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Message(result.rows[0]);
    } catch (error) {
      logger.error('Error finding message by ID:', error);
      throw error;
    }
  }

  // Find message by message_id and channel
  static async findByMessageId(messageId, channelId) {
    try {
      const query = 'SELECT * FROM messages WHERE message_id = $1 AND channel_id = $2';
      const result = await pool.query(query, [messageId, channelId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Message(result.rows[0]);
    } catch (error) {
      logger.error('Error finding message by message ID:', error);
      throw error;
    }
  }

  // Get messages by ticket ID
  static async findByTicketId(ticketId, options = {}) {
    try {
      const { limit = 50, offset = 0, order = 'ASC' } = options;
      
      const query = `
        SELECT m.*, c.name as contact_name, c.phone as contact_phone
        FROM messages m
        LEFT JOIN contacts c ON m.contact_id = c.id
        WHERE m.ticket_id = $1
        ORDER BY m.timestamp ${order}
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [ticketId, limit, offset]);
      return result.rows.map(row => new Message(row));
    } catch (error) {
      logger.error('Error finding messages by ticket ID:', error);
      throw error;
    }
  }

  // Get messages by contact ID
  static async findByContactId(contactId, options = {}) {
    try {
      const { limit = 50, offset = 0, order = 'DESC' } = options;
      
      const query = `
        SELECT * FROM messages 
        WHERE contact_id = $1
        ORDER BY timestamp ${order}
        LIMIT $2 OFFSET $3
      `;
      
      const result = await pool.query(query, [contactId, limit, offset]);
      return result.rows.map(row => new Message(row));
    } catch (error) {
      logger.error('Error finding messages by contact ID:', error);
      throw error;
    }
  }

  // Get messages by user ID
  static async findByUserId(userId, options = {}) {
    try {
      const { limit = 100, offset = 0, startDate, endDate, type, status } = options;
      
      let query = `
        SELECT m.*, c.name as contact_name, c.phone as contact_phone
        FROM messages m
        LEFT JOIN contacts c ON m.contact_id = c.id
        WHERE m.user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (startDate) {
        paramCount++;
        query += ` AND m.timestamp >= $${paramCount}`;
        values.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        query += ` AND m.timestamp <= $${paramCount}`;
        values.push(endDate);
      }
      
      if (type) {
        paramCount++;
        query += ` AND m.type = $${paramCount}`;
        values.push(type);
      }
      
      if (status) {
        paramCount++;
        query += ` AND m.status = $${paramCount}`;
        values.push(status);
      }
      
      query += ` ORDER BY m.timestamp DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new Message(row));
    } catch (error) {
      logger.error('Error finding messages by user ID:', error);
      throw error;
    }
  }

  // Update message status
  async updateStatus(status) {
    try {
      const query = `
        UPDATE messages 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [status, this.id]);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      
      return this;
    } catch (error) {
      logger.error('Error updating message status:', error);
      throw error;
    }
  }

  // Update message
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 0;
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'id') {
          paramCount++;
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
        }
      });
      
      if (fields.length === 0) {
        return this;
      }
      
      paramCount++;
      values.push(this.id);
      
      const query = `
        UPDATE messages 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      
      return this;
    } catch (error) {
      logger.error('Error updating message:', error);
      throw error;
    }
  }

  // Delete message
  async delete() {
    try {
      const query = 'DELETE FROM messages WHERE id = $1';
      await pool.query(query, [this.id]);
      return true;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  // Get message statistics
  static async getStats(userId, options = {}) {
    try {
      const { startDate, endDate } = options;
      
      let query = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE is_from_me = true) as sent_messages,
          COUNT(*) FILTER (WHERE is_from_me = false) as received_messages,
          COUNT(*) FILTER (WHERE type = 'text') as text_messages,
          COUNT(*) FILTER (WHERE type = 'image') as image_messages,
          COUNT(*) FILTER (WHERE type = 'document') as document_messages,
          COUNT(*) FILTER (WHERE type = 'audio') as audio_messages,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_messages,
          COUNT(*) FILTER (WHERE status = 'read') as read_messages,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_messages
        FROM messages 
        WHERE user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (startDate) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        values.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        values.push(endDate);
      }
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting message stats:', error);
      throw error;
    }
  }

  // Search messages
  static async search(userId, searchTerm, options = {}) {
    try {
      const { limit = 50, offset = 0, type } = options;
      
      let query = `
        SELECT m.*, c.name as contact_name, c.phone as contact_phone
        FROM messages m
        LEFT JOIN contacts c ON m.contact_id = c.id
        WHERE m.user_id = $1 AND m.content ILIKE $2
      `;
      
      const values = [userId, `%${searchTerm}%`];
      let paramCount = 2;
      
      if (type) {
        paramCount++;
        query += ` AND m.type = $${paramCount}`;
        values.push(type);
      }
      
      query += ` ORDER BY m.timestamp DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new Message(row));
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  // Serialize message for JSON response
  toJSON() {
    return {
      id: this.id,
      ticket_id: this.ticket_id,
      contact_id: this.contact_id,
      user_id: this.user_id,
      channel_id: this.channel_id,
      message_id: this.message_id,
      type: this.type,
      content: this.content,
      media_url: this.media_url,
      media_type: this.media_type,
      status: this.status,
      is_from_me: this.is_from_me,
      timestamp: this.timestamp,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default Message;