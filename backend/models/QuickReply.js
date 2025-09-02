import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

class QuickReply {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.content = data.content;
    this.shortcut = data.shortcut;
    this.category = data.category;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new quick reply
  static async create(quickReplyData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO quick_replies (
          id, user_id, title, content, shortcut, category
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        id,
        quickReplyData.user_id,
        quickReplyData.title,
        quickReplyData.content,
        quickReplyData.shortcut || null,
        quickReplyData.category || 'general'
      ];
      
      const result = await pool.query(query, values);
      return new QuickReply(result.rows[0]);
    } catch (error) {
      logger.error('Error creating quick reply:', error);
      throw error;
    }
  }

  // Find quick reply by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM quick_replies WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new QuickReply(result.rows[0]);
    } catch (error) {
      logger.error('Error finding quick reply by ID:', error);
      throw error;
    }
  }

  // Find quick reply by shortcut
  static async findByShortcut(shortcut, userId) {
    try {
      const query = 'SELECT * FROM quick_replies WHERE shortcut = $1 AND user_id = $2';
      const result = await pool.query(query, [shortcut, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new QuickReply(result.rows[0]);
    } catch (error) {
      logger.error('Error finding quick reply by shortcut:', error);
      throw error;
    }
  }

  // Get quick replies by user ID
  static async findByUserId(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, category, search } = options;
      
      let query = `
        SELECT * FROM quick_replies 
        WHERE user_id = $1
      `;
      
      const values = [userId];
      let paramCount = 1;
      
      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        values.push(category);
      }
      
      if (search) {
        paramCount++;
        query += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount} OR shortcut ILIKE $${paramCount})`;
        values.push(`%${search}%`);
      }
      
      query += ` ORDER BY category, title`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new QuickReply(row));
    } catch (error) {
      logger.error('Error finding quick replies by user ID:', error);
      throw error;
    }
  }

  // Get quick replies by category
  static async findByCategory(userId, category) {
    try {
      const query = `
        SELECT * FROM quick_replies 
        WHERE user_id = $1 AND category = $2
        ORDER BY title
      `;
      
      const result = await pool.query(query, [userId, category]);
      return result.rows.map(row => new QuickReply(row));
    } catch (error) {
      logger.error('Error finding quick replies by category:', error);
      throw error;
    }
  }

  // Get all categories for user
  static async getCategories(userId) {
    try {
      const query = `
        SELECT DISTINCT category, COUNT(*) as count
        FROM quick_replies 
        WHERE user_id = $1
        GROUP BY category
        ORDER BY category
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting quick reply categories:', error);
      throw error;
    }
  }

  // Search quick replies
  static async search(userId, searchTerm, options = {}) {
    try {
      const { limit = 20, category } = options;
      
      let query = `
        SELECT * FROM quick_replies 
        WHERE user_id = $1 AND (
          title ILIKE $2 OR 
          content ILIKE $2 OR 
          shortcut ILIKE $2
        )
      `;
      
      const values = [userId, `%${searchTerm}%`];
      let paramCount = 2;
      
      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        values.push(category);
      }
      
      query += ` ORDER BY 
        CASE 
          WHEN shortcut ILIKE $2 THEN 1
          WHEN title ILIKE $2 THEN 2
          ELSE 3
        END, title
      `;
      
      query += ` LIMIT $${paramCount + 1}`;
      values.push(limit);
      
      const result = await pool.query(query, values);
      return result.rows.map(row => new QuickReply(row));
    } catch (error) {
      logger.error('Error searching quick replies:', error);
      throw error;
    }
  }

  // Update quick reply
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
        UPDATE quick_replies 
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
      logger.error('Error updating quick reply:', error);
      throw error;
    }
  }

  // Delete quick reply
  async delete() {
    try {
      const query = 'DELETE FROM quick_replies WHERE id = $1';
      await pool.query(query, [this.id]);
      return true;
    } catch (error) {
      logger.error('Error deleting quick reply:', error);
      throw error;
    }
  }

  // Bulk create quick replies
  static async bulkCreate(userId, quickReplies) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdReplies = [];
      
      for (const quickReplyData of quickReplies) {
        const id = uuidv4();
        const query = `
          INSERT INTO quick_replies (
            id, user_id, title, content, shortcut, category
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        const values = [
          id,
          userId,
          quickReplyData.title,
          quickReplyData.content,
          quickReplyData.shortcut || null,
          quickReplyData.category || 'general'
        ];
        
        const result = await client.query(query, values);
        createdReplies.push(new QuickReply(result.rows[0]));
      }
      
      await client.query('COMMIT');
      return createdReplies;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error bulk creating quick replies:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get quick reply statistics
  static async getStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_replies,
          COUNT(DISTINCT category) as total_categories,
          COUNT(*) FILTER (WHERE shortcut IS NOT NULL) as with_shortcuts,
          AVG(LENGTH(content)) as avg_content_length
        FROM quick_replies 
        WHERE user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting quick reply stats:', error);
      throw error;
    }
  }

  // Check if shortcut is available
  static async isShortcutAvailable(shortcut, userId, excludeId = null) {
    try {
      let query = 'SELECT id FROM quick_replies WHERE shortcut = $1 AND user_id = $2';
      const values = [shortcut, userId];
      
      if (excludeId) {
        query += ' AND id != $3';
        values.push(excludeId);
      }
      
      const result = await pool.query(query, values);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking shortcut availability:', error);
      throw error;
    }
  }

  // Serialize quick reply for JSON response
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      content: this.content,
      shortcut: this.shortcut,
      category: this.category,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default QuickReply;