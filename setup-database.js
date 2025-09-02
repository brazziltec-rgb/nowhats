import 'dotenv/config';
import { query, closePool } from './backend/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = path.join(__dirname, 'backend', 'database', 'migrations');

async function runMigrations() {
  try {
    console.log('🚀 Iniciando configuração do banco de dados PostgreSQL...');
    
    // Criar tabela de controle de migrações se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela de migrações criada');
    
    // Ler arquivos de migração
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Encontradas ${migrationFiles.length} migrações`);
    
    for (const file of migrationFiles) {
      // Verificar se a migração já foi executada
      const result = await query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (result.rows.length > 0) {
        console.log(`⏭️  Migração ${file} já executada`);
        continue;
      }
      
      // Executar migração
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`🔄 Executando migração: ${file}`);
      
      // Executar SQL da migração
      await query(migrationSQL);
      
      // Registrar migração como executada
      await query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );
      
      console.log(`✅ Migração ${file} executada com sucesso`);
    }
    
    console.log('🎉 Todas as migrações foram executadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };