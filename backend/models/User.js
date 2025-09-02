import { query } from '../config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.avatar_url = data.avatar_url;
    this.role = data.role;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new user
  static async create({ email, password, name, role = 'agent' }) {
    try {
      const id = uuidv4();
      const password_hash = await bcrypt.hash(password, 10);
      
      const result = await query(
        `INSERT INTO users (id, email, password_hash, name, role, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, name, avatar_url, role, is_active, created_at, updated_at`,
        [id, email, password_hash, name, role, true]
      );
      
      // Create profile entry
      await query(
        `INSERT INTO profiles (user_id) VALUES ($1)`,
        [id]
      );
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT id, email, password_hash, name, avatar_url, role, is_active, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return {
        ...result.rows[0],
        user: new User(result.rows[0])
      };
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const result = await query(
        'SELECT id, email, name, avatar_url, role, is_active, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  // Update user
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
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() 
         WHERE id = $${paramCount} 
         RETURNING id, email, name, avatar_url, role, created_at, updated_at`,
        values
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Update profile as well
      if (updates.company_name || updates.department || updates.position) {
        await query(
          'UPDATE profiles SET company_name = COALESCE($1, company_name), department = COALESCE($2, department), position = COALESCE($3, position), updated_at = NOW() WHERE user_id = $4',
          [updates.company_name, updates.department, updates.position, id]
        );
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Get all users
  static async findAll(limit = 50, offset = 0) {
    try {
      const result = await query(
        'SELECT id, email, name, avatar_url, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return result.rows.map(row => new User(row));
    } catch (error) {
      throw new Error(`Error finding all users: ${error.message}`);
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Convert to JSON (remove sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar_url: this.avatar_url,
      role: this.role,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default User;