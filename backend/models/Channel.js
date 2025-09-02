import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Channel {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.api = data.api;
    this.status = data.status;
    this.qr_code = data.qr_code;
    this.instance_id = data.instance_id;
    this.last_sync = data.last_sync;
    this.created_at = data.created_at;
  }

  // Create a new channel
  static async create({ user_id, name, api }) {
    try {
      const id = uuidv4();
      
      const result = await query(
        `INSERT INTO channels (id, user_id, name, api, status) 
         VALUES ($1, $2, $3, $4, 'disconnected') 
         RETURNING *`,
        [id, user_id, name, api]
      );
      
      return new Channel(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating channel: ${error.message}`);
    }
  }

  // Find channel by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM channels WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Channel(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding channel by ID: ${error.message}`);
    }
  }

  // Find channels by user ID
  static async findByUserId(user_id) {
    try {
      const result = await query(
        'SELECT * FROM channels WHERE user_id = $1 ORDER BY created_at DESC',
        [user_id]
      );
      
      return result.rows.map(row => new Channel(row));
    } catch (error) {
      throw new Error(`Error finding channels by user ID: ${error.message}`);
    }
  }

  // Update channel status
  static async updateStatus(id, status, qr_code = null) {
    try {
      const result = await query(
        `UPDATE channels 
         SET status = $1, qr_code = $2, last_sync = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [status, qr_code, id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Channel(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating channel status: ${error.message}`);
    }
  }

  // Update channel instance ID
  static async updateInstanceId(id, instance_id) {
    try {
      const result = await query(
        `UPDATE channels 
         SET instance_id = $1, last_sync = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [instance_id, id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Channel(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating channel instance ID: ${error.message}`);
    }
  }

  // Update channel
  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;
      
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(id);
      
      const result = await query(
        `UPDATE channels SET ${fields.join(', ')}, last_sync = NOW() 
         WHERE id = $${paramCount} 
         RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Channel(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating channel: ${error.message}`);
    }
  }

  // Delete channel
  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM channels WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error deleting channel: ${error.message}`);
    }
  }

  // Get connected channels by user ID
  static async getConnectedByUserId(user_id) {
    try {
      const result = await query(
        "SELECT * FROM channels WHERE user_id = $1 AND status = 'connected' ORDER BY created_at DESC",
        [user_id]
      );
      
      return result.rows.map(row => new Channel(row));
    } catch (error) {
      throw new Error(`Error finding connected channels: ${error.message}`);
    }
  }

  // Get channels by API type
  static async findByApiType(api_type, user_id = null) {
    try {
      let queryText = 'SELECT * FROM channels WHERE api = $1';
      let params = [api_type];
      
      if (user_id) {
        queryText += ' AND user_id = $2';
        params.push(user_id);
      }
      
      queryText += ' ORDER BY created_at DESC';
      
      const result = await query(queryText, params);
      
      return result.rows.map(row => new Channel(row));
    } catch (error) {
      throw new Error(`Error finding channels by API type: ${error.message}`);
    }
  }

  // Get all connected channels
  static async findConnected() {
    try {
      const result = await query(
        "SELECT * FROM channels WHERE status = 'connected' ORDER BY created_at DESC"
      );
      
      return result.rows.map(row => new Channel(row));
    } catch (error) {
      throw new Error(`Error finding connected channels: ${error.message}`);
    }
  }

  // Check if user owns channel
  static async isOwner(channel_id, user_id) {
    try {
      const result = await query(
        'SELECT id FROM channels WHERE id = $1 AND user_id = $2',
        [channel_id, user_id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error checking channel ownership: ${error.message}`);
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      api: this.api,
      status: this.status,
      qr_code: this.qr_code,
      instance_id: this.instance_id,
      last_sync: this.last_sync,
      created_at: this.created_at
    };
  }
}

export default Channel;