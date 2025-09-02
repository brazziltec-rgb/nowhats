import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

class Ticket {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.contact_id = data.contact_id;
    this.channel_id = data.channel_id;
    this.assigned_to = data.assigned_to;
    this.status = data.status;
    this.priority = data.priority;
    this.subject = data.subject;
    this.tags = data.tags;
    this.notes = data.notes;
    this.closed_at = data.closed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new ticket
  static async create(ticketData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO tickets (
          id, user_id, contact_id, channel_id, assigned_to, 
          status, priority, subject, tags, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        id,
        ticketData.user_id,
        ticketData.contact_id,
        ticketData.channel_id,
        ticketData.assigned_to || null,
        ticketData.status || 'open',
        ticketData.priority || 'medium',
        ticketData.subject || null,
        ticketData.tags || null,
        ticketData.notes || null
      ];
      
      const result = await pool.query(query, values);
      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error('Error creating ticket:', error);
      throw error;
    }
  }

  // Find ticket by ID
  static async findById(id) {
    try {
      const query = `
        SELECT t.*, 
               c.name as contact_name, 
               c.phone as contact_phone,
               c.avatar as contact_avatar,
               ch.name as channel_name,
               u.name as assigned_user_name
        FROM tickets t
        LEFT JOIN contacts c ON t.contact_id = c.id
        LEFT JOIN channels ch ON t.channel_id = ch.id
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error('Error finding ticket by ID:', error);
      throw error;
    }
  }

  // Find or create ticket for contact
  static async findOrCreateForContact(contactId, channelId, userId) {
    try {
      // First, try to find an open ticket for this contact
      const existingQuery = `
        SELECT * FROM tickets 
        WHERE contact_id = $1 AND status IN ('open', 'pending') 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const existingResult = await pool.query(existingQuery, [contactId]);
      
      if (existingResult.rows.length > 0) {
        return new Ticket(existingResult.rows[0]);
      }
      
      // If no open ticket exists, create a new one
      return await this.create({
        user_id: userId,
        contact_id: contactId,
        channel_id: channelId,
        status: 'open',
        priority: 'medium'
      });
    } catch (error) {
      logger.error('Error finding or creating ticket for contact:', error);
      throw error;
    }
  }

  // Get tickets by user ID
  static async findByUserId(userId, options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        status, 
        priority, 
        assignedTo, 
        search,
        startDate,
        endDate
      } = options;
      
      let query = `
        SELECT t.*, 
               c.name as contact_name, 
               c.phone as contact_phone,
               c.avatar as contact_avatar,
               ch.name as channel_name,
               u.name as assigned_user_name,
               COUNT(m.id) as message_count,
               MAX(m.timestamp) as last_message_at
        FROM tickets t
        LEFT JOIN contacts c ON t.contact_id = c.id
        LEFT JOIN channels ch ON t.channel_id = ch.id
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN messages m ON t.id = m.ticket_id
        WHERE t.user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (status) {
        paramCount++;
        query += ` AND t.status = $${paramCount}`;
        values.push(status);
      }
      
      if (priority) {
        paramCount++;
        query += ` AND t.priority = $${paramCount}`;
        values.push(priority);
      }
      
      if (assignedTo) {
        paramCount++;
        query += ` AND t.assigned_to = $${paramCount}`;
        values.push(assignedTo);
      }
      
      if (search) {
        paramCount++;
        query += ` AND (c.name ILIKE $${paramCount} OR c.phone ILIKE $${paramCount} OR t.subject ILIKE $${paramCount})`;
        values.push(`%${search}%`);
      }
      
      if (startDate) {
        paramCount++;
        query += ` AND t.created_at >= $${paramCount}`;
        values.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        query += ` AND t.created_at <= $${paramCount}`;
        values.push(endDate);
      }
      
      query += ` GROUP BY t.id, c.id, ch.id, u.id`;
      query += ` ORDER BY t.updated_at DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new Ticket(row));
    } catch (error) {
      logger.error('Error finding tickets by user ID:', error);
      throw error;
    }
  }

  // Get tickets assigned to user
  static async findAssignedToUser(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, status } = options;
      
      let query = `
        SELECT t.*, 
               c.name as contact_name, 
               c.phone as contact_phone,
               c.avatar as contact_avatar,
               ch.name as channel_name
        FROM tickets t
        LEFT JOIN contacts c ON t.contact_id = c.id
        LEFT JOIN channels ch ON t.channel_id = ch.id
        WHERE t.assigned_to = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (status) {
        paramCount++;
        query += ` AND t.status = $${paramCount}`;
        values.push(status);
      }
      
      query += ` ORDER BY t.updated_at DESC`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new Ticket(row));
    } catch (error) {
      logger.error('Error finding tickets assigned to user:', error);
      throw error;
    }
  }

  // Update ticket
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
      
      // Add closed_at timestamp if status is being changed to closed
      if (updateData.status === 'closed' && this.status !== 'closed') {
        paramCount++;
        fields.push(`closed_at = $${paramCount}`);
        values.push(new Date());
      }
      
      paramCount++;
      values.push(this.id);
      
      const query = `
        UPDATE tickets 
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
      logger.error('Error updating ticket:', error);
      throw error;
    }
  }

  // Close ticket
  async close(notes = null) {
    try {
      const updateData = { 
        status: 'closed',
        closed_at: new Date()
      };
      
      if (notes) {
        updateData.notes = notes;
      }
      
      return await this.update(updateData);
    } catch (error) {
      logger.error('Error closing ticket:', error);
      throw error;
    }
  }

  // Assign ticket to user
  async assignTo(userId) {
    try {
      return await this.update({ assigned_to: userId });
    } catch (error) {
      logger.error('Error assigning ticket:', error);
      throw error;
    }
  }

  // Delete ticket
  async delete() {
    try {
      const query = 'DELETE FROM tickets WHERE id = $1';
      await pool.query(query, [this.id]);
      return true;
    } catch (error) {
      logger.error('Error deleting ticket:', error);
      throw error;
    }
  }

  // Get ticket statistics
  static async getStats(userId, options = {}) {
    try {
      const { startDate, endDate } = options;
      
      let query = `
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tickets,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
          COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
          COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
          COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
          COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) as assigned_tickets,
          AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600) as avg_resolution_hours
        FROM tickets 
        WHERE user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (startDate) {
        paramCount++;
        query += ` AND created_at >= $${paramCount}`;
        values.push(startDate);
      }
      
      if (endDate) {
        paramCount++;
        query += ` AND created_at <= $${paramCount}`;
        values.push(endDate);
      }
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting ticket stats:', error);
      throw error;
    }
  }

  // Serialize ticket for JSON response
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      contact_id: this.contact_id,
      channel_id: this.channel_id,
      assigned_to: this.assigned_to,
      status: this.status,
      priority: this.priority,
      subject: this.subject,
      tags: this.tags,
      notes: this.notes,
      closed_at: this.closed_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      // Include related data if available
      contact_name: this.contact_name,
      contact_phone: this.contact_phone,
      contact_avatar: this.contact_avatar,
      channel_name: this.channel_name,
      assigned_user_name: this.assigned_user_name,
      message_count: this.message_count,
      last_message_at: this.last_message_at
    };
  }
}

export default Ticket;