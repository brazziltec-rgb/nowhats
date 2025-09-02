const { pool, closePool } = require('./config/database');
const logger = require('./config/logger');

async function testConnection() {
    try {
        logger.info('Testando conexão com o banco de dados...');
        
        // Testar conexão básica
        const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        
        logger.info('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        logger.info('Hora atual:', result.rows[0].current_time);
        logger.info('Versão do PostgreSQL:', result.rows[0].pg_version);
        
        // Verificar se o banco de dados existe
        const dbCheck = await pool.query(
            "SELECT datname FROM pg_database WHERE datname = $1",
            [process.env.DB_NAME || 'atendezap']
        );
        
        if (dbCheck.rows.length > 0) {
            logger.info('✅ Banco de dados encontrado:', dbCheck.rows[0].datname);
        } else {
            logger.warn('⚠️  Banco de dados não encontrado. Será necessário criá-lo.');
        }
        
    } catch (error) {
        logger.error('❌ Erro ao conectar com o banco de dados:');
        logger.error('Mensagem:', error.message);
        logger.error('Código:', error.code);
        
        if (error.code === 'ECONNREFUSED') {
            logger.error('💡 Solução: Verifique se o PostgreSQL está rodando na porta', process.env.DB_PORT || 5432);
        } else if (error.code === '28P01') {
            logger.error('💡 Solução: Verifique as credenciais do banco de dados (usuário/senha)');
        } else if (error.code === '3D000') {
            logger.error('💡 Solução: O banco de dados não existe. Crie o banco primeiro.');
        }
        
        process.exit(1);
    } finally {
        await closePool();
    }
}

testConnection();