import fs from 'fs';
import path from 'path';
import { query, run, closeDb } from '../config/database-sqlite.js';
import logger from '../config/logger.js';

class SQLiteMigrationManager {
    constructor() {
        this.migrationsDir = path.join(__dirname, 'migrations');
        this.migrationsTable = 'schema_migrations';
    }

    async createMigrationsTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        try {
            await run(createTableSQL);
            logger.info('Tabela de migrações criada/verificada com sucesso');
        } catch (error) {
            logger.error('Erro ao criar tabela de migrações:', error);
            throw error;
        }
    }

    async getExecutedMigrations() {
        try {
            const result = await query(
                `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at`
            );
            return result.rows.map(row => row.filename);
        } catch (error) {
            logger.error('Erro ao buscar migrações executadas:', error);
            throw error;
        }
    }

    async getPendingMigrations() {
        const migrationFiles = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        const executedMigrations = await this.getExecutedMigrations();
        
        return migrationFiles.filter(file => !executedMigrations.includes(file));
    }

    async executeMigration(filename) {
        const filePath = path.join(this.migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        logger.info(`Executando migração: ${filename}`);
        
        try {
            // SQLite não suporta transações com múltiplas declarações DDL
            // Vamos executar cada comando separadamente
            const commands = sql.split(';').filter(cmd => cmd.trim());
            
            for (const command of commands) {
                if (command.trim()) {
                    await run(command.trim());
                }
            }
            
            // Registrar migração como executada
            await run(
                `INSERT INTO ${this.migrationsTable} (filename) VALUES (?)`,
                [filename]
            );
            
            logger.info(`Migração executada com sucesso: ${filename}`);
        } catch (error) {
            logger.error(`Erro ao executar migração ${filename}:`, error);
            throw error;
        }
    }

    async runMigrations() {
        await this.createMigrationsTable();
        
        const pendingMigrations = await this.getPendingMigrations();
        
        if (pendingMigrations.length === 0) {
            logger.info('Nenhuma migração pendente encontrada');
            return;
        }
        
        logger.info(`Encontradas ${pendingMigrations.length} migrações pendentes`);
        
        for (const migration of pendingMigrations) {
            await this.executeMigration(migration);
        }
        
        logger.info('Todas as migrações foram executadas com sucesso!');
    }

    async rollbackLastMigration() {
        const executedMigrations = await this.getExecutedMigrations();
        
        if (executedMigrations.length === 0) {
            logger.info('Nenhuma migração para reverter');
            return;
        }
        
        const lastMigration = executedMigrations[executedMigrations.length - 1];
        
        // Para SQLite, rollback é mais complexo - por enquanto apenas removemos o registro
        await run(
            `DELETE FROM ${this.migrationsTable} WHERE filename = ?`,
            [lastMigration]
        );
        
        logger.info(`Migração revertida: ${lastMigration}`);
        logger.warn('ATENÇÃO: O rollback apenas remove o registro. Você deve reverter manualmente as alterações no banco.');
    }

    async listMigrations() {
        const migrationFiles = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        const executedMigrations = await this.getExecutedMigrations();
        
        logger.info('Status das migrações:');
        
        migrationFiles.forEach(file => {
            const status = executedMigrations.includes(file) ? '✅ Executada' : '⏳ Pendente';
            logger.info(`${status} - ${file}`);
        });
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const migrationManager = new SQLiteMigrationManager();
    
    try {
        logger.info('Iniciando processo de migração SQLite...');
        
        switch (command) {
            case 'run':
                await migrationManager.runMigrations();
                break;
            case 'rollback':
                await migrationManager.rollbackLastMigration();
                break;
            case 'status':
                await migrationManager.listMigrations();
                break;
            default:
                logger.info('Comandos disponíveis:');
                logger.info('  run     - Executa migrações pendentes');
                logger.info('  rollback - Reverte a última migração');
                logger.info('  status  - Lista status das migrações');
                break;
        }
        
        logger.info('Processo concluído com sucesso!');
    } catch (error) {
        logger.error('Erro durante o processo de migração:', error.message);
        logger.error('Stack trace:', error.stack);
        if (error.code) {
            logger.error('Código do erro:', error.code);
        }
        process.exit(1);
    } finally {
        // Fechar conexão
        try {
            await closeDb();
        } catch (closeError) {
            logger.error('Erro ao fechar banco:', closeError.message);
        }
    }
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv[1] === __filename) {
    main();
}

export default SQLiteMigrationManager;