import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

class Contact {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.phone = data.phone;
    this.name = data.name;
    this.avatar = data.avatar;
    this.is_group = data.is_group;
    this.group_participants = data.group_participants;
    this.last_message_at = data.last_message_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new contact
  static async create(contactData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO contacts (
          id, user_id, phone, name, avatar, is_group, group_participants
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        id,
        contactData.user_id,
        contactData.phone,
        contactData.name || null,
        contactData.avatar || null,
        contactData.is_group || false,
        contactData.group_participants || null
      ];
      
      const result = await pool.query(query, values);
      return new Contact(result.rows[0]);
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw error;
    }
  }

  // Find contact by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM contacts WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Contact(result.rows[0]);
    } catch (error) {
      logger.error('Error finding contact by ID:', error);
      throw error;
    }
  }

  // Find contact by phone and user
  static async findByPhoneAndUser(phone, userId) {
    try {
      const query = 'SELECT * FROM contacts WHERE phone = $1 AND user_id = $2';
      const result = await pool.query(query, [phone, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Contact(result.rows[0]);
    } catch (error) {
      logger.error('Error finding contact by phone and user:', error);
      throw error;
    }
  }

  // Find or create contact
  static async findOrCreate(contactData) {
    try {
      let contact = await this.findByPhoneAndUser(contactData.phone, contactData.user_id);
      
      if (!contact) {
        contact = await this.create(contactData);
      } else {
        // Update contact info if provided
        if (contactData.name && contactData.name !== contact.name) {
          await contact.update({ name: contactData.name });
        }
        if (contactData.avatar && contactData.avatar !== contact.avatar) {
          await contact.update({ avatar: contactData.avatar });
        }
      }
      
      return contact;
    } catch (error) {
      logger.error('Error finding or creating contact:', error);
      throw error;
    }
  }

  // Get contacts by user ID
  static async findByUserId(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, search = '', isGroup = null } = options;
      
      let query = `
        SELECT * FROM contacts 
        WHERE user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
        values.push(`%${search}%`);
      }
      
      if (isGroup !== null) {
        paramCount++;
        query += ` AND is_group = $${paramCount}`;
        values.push(isGroup);
      }
      
      query += ` ORDER BY last_message_at DESC NULLS LAST, created_at DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new Contact(row));
    } catch (error) {
      logger.error('Error finding contacts by user ID:', error);
      throw error;
    }
  }

  // Update contact
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
        UPDATE contacts 
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
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  // Update last message timestamp
  async updateLastMessage() {
    try {
      const query = `
        UPDATE contacts 
        SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pool.query(query, [this.id]);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      
      return this;
    } catch (error) {
      logger.error('Error updating last message timestamp:', error);
      throw error;
    }
  }

  // Delete contact
  async delete() {
    try {
      const query = 'DELETE FROM contacts WHERE id = $1';
      await pool.query(query, [this.id]);
      return true;
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw error;
    }
  }

  // Get contact statistics
  static async getStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_contacts,
          COUNT(*) FILTER (WHERE is_group = true) as groups,
          COUNT(*) FILTER (WHERE is_group = false) as individuals,
          COUNT(*) FILTER (WHERE last_message_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_week
        FROM contacts 
        WHERE user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting contact stats:', error);
      throw error;
    }
  }

  // Serialize contact for JSON response
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      phone: this.phone,
      name: this.name,
      avatar: this.avatar,
      is_group: this.is_group,
      group_participants: this.group_participants,
      last_message_at: this.last_message_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default Contact;