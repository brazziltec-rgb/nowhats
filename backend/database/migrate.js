import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, closePool } from '../config/database.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseMigrator {
    constructor() {
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.migrationsTable = 'schema_migrations';
    }

    /**
     * Criar tabela de controle de migrações
     */
    async createMigrationsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await pool.query(query);
        logger.info('Tabela de migrações criada/verificada');
    }

    /**
     * Obter migrações já executadas
     */
    async getExecutedMigrations() {
        try {
            const result = await pool.query(
                `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at`
            );
            return result.rows.map(row => row.filename);
        } catch (error) {
            if (error.code === '42P01') { // Tabela não existe
                return [];
            }
            throw error;
        }
    }

    /**
     * Obter arquivos de migração disponíveis
     */
    async getAvailableMigrations() {
        try {
            const files = await fs.promises.readdir(this.migrationsPath);
            return files
                .filter(file => file.endsWith('.sql'))
                .sort();
        } catch (error) {
            logger.error('Erro ao ler diretório de migrações:', error);
            return [];
        }
    }

    /**
     * Executar uma migração
     */
    async executeMigration(filename) {
        const filePath = path.join(this.migrationsPath, filename);
        
        try {
            const sql = await fs.promises.readFile(filePath, 'utf8');
            
            // Iniciar transação
            await pool.query('BEGIN');
            
            try {
                // Executar SQL da migração
                await pool.query(sql);
                
                // Registrar migração como executada
                await pool.query(
                    `INSERT INTO ${this.migrationsTable} (filename) VALUES ($1)`,
                    [filename]
                );
                
                // Confirmar transação
                await pool.query('COMMIT');
                
                logger.info(`Migração executada com sucesso: ${filename}`);
            } catch (error) {
                // Reverter transação em caso de erro
                await pool.query('ROLLBACK');
                throw error;
            }
        } catch (error) {
            logger.error(`Erro ao executar migração ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Executar todas as migrações pendentes
     */
    async runMigrations() {
        try {
            logger.info('Iniciando processo de migração...');
            
            // Criar tabela de controle de migrações
            await this.createMigrationsTable();
            
            // Obter migrações executadas e disponíveis
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = await this.getAvailableMigrations();
            
            // Filtrar migrações pendentes
            const pendingMigrations = availableMigrations.filter(
                migration => !executedMigrations.includes(migration)
            );
            
            if (pendingMigrations.length === 0) {
                logger.info('Nenhuma migração pendente encontrada');
                return;
            }
            
            logger.info(`Encontradas ${pendingMigrations.length} migrações pendentes`);
            
            // Executar migrações pendentes
            for (const migration of pendingMigrations) {
                await this.executeMigration(migration);
            }
            
            logger.info('Todas as migrações foram executadas com sucesso');
        } catch (error) {
            logger.error('Erro durante o processo de migração:', error);
            throw error;
        }
    }

    /**
     * Verificar status das migrações
     */
    async getStatus() {
        try {
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = await this.getAvailableMigrations();
            const pendingMigrations = availableMigrations.filter(
                migration => !executedMigrations.includes(migration)
            );
            
            return {
                executed: executedMigrations,
                pending: pendingMigrations,
                total: availableMigrations.length
            };
        } catch (error) {
            logger.error('Erro ao verificar status das migrações:', error);
            throw error;
        }
    }

    /**
     * Criar nova migração
     */
    async createMigration(name) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
        const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
        const filePath = path.join(this.migrationsPath, filename);
        
        const template = `-- Migração: ${name}
-- Criada em: ${new Date().toISOString()}

-- Adicione seu SQL aqui

-- Exemplo:
-- CREATE TABLE exemplo (
--     id SERIAL PRIMARY KEY,
--     nome VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;
        
        try {
            await fs.promises.writeFile(filePath, template);
            logger.info(`Nova migração criada: ${filename}`);
            return filename;
        } catch (error) {
            logger.error('Erro ao criar migração:', error);
            throw error;
        }
    }
}

// Função principal para execução via linha de comando
async function main() {
    const migrator = new DatabaseMigrator();
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'run':
            case 'migrate':
                await migrator.runMigrations();
                break;
                
            case 'status':
                const status = await migrator.getStatus();
                console.log('Status das Migrações:');
                console.log(`Total: ${status.total}`);
                console.log(`Executadas: ${status.executed.length}`);
                console.log(`Pendentes: ${status.pending.length}`);
                if (status.pending.length > 0) {
                    console.log('Migrações pendentes:', status.pending);
                }
                break;
                
            case 'create':
                const name = process.argv[3];
                if (!name) {
                    console.error('Nome da migração é obrigatório');
                    console.log('Uso: node migrate.js create "nome_da_migracao"');
                    process.exit(1);
                }
                await migrator.createMigration(name);
                break;
                
            default:
                console.log('Comandos disponíveis:');
                console.log('  run|migrate - Executar migrações pendentes');
                console.log('  status      - Verificar status das migrações');
                console.log('  create      - Criar nova migração');
                console.log('');
                console.log('Exemplos:');
                console.log('  node migrate.js run');
                console.log('  node migrate.js status');
                console.log('  node migrate.js create "adicionar_tabela_usuarios"');
        }
    } catch (error) {
        logger.error('Erro na execução:', error.message);
        logger.error('Stack trace:', error.stack);
        if (error.code) {
            logger.error('Código do erro:', error.code);
        }
        if (error.detail) {
            logger.error('Detalhes:', error.detail);
        }
        process.exit(1);
    } finally {
        // Fechar pool de conexões
        try {
            await closePool();
        } catch (closeError) {
            logger.error('Erro ao fechar pool:', closeError.message);
        }
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default DatabaseMigrator;