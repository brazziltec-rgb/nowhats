import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

// Importar configurações
import logger from './config/logger.js';
// Configuração do banco PostgreSQL
import db from './config/database.js';

// Importar middlewares
import { 
    securityHeaders, 
    generalRateLimit, 
    suspiciousActivityDetector,
    validateUserAgent,
    bodySizeLimit,
    customSecurityHeaders,
    corsHandler,
    authRateLimit,
    messageRateLimit,
    webhookRateLimit
} from './middleware/security.js';
import { 
    errorHandler, 
    notFound, 
    requestLogger, 
    requestTimeout 
} from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validation.js';

// Importar rotas
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import webhookRoutes from './routes/webhooks.js';
import quickReplyRoutes from './routes/quickReplies.js';

// Importar serviços
import SessionManager from './services/SessionManager.js';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Para compatibilidade com __dirname em módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança e logging
app.use(requestTimeout(30000)); // Timeout de 30 segundos
app.use(requestLogger); // Log de requests
app.use(securityHeaders); // Headers de segurança
app.use(corsHandler); // CORS customizado
app.use(suspiciousActivityDetector); // Detectar atividade suspeita
app.use(validateUserAgent); // Validar User-Agent
app.use(generalRateLimit); // Rate limiting geral
app.use(compression()); // Compressão
app.use(bodySizeLimit('10mb')); // Limite de tamanho do body
app.use(express.json({ limit: '10mb' })); // Parser JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parser URL encoded
app.use(sanitizeInput); // Sanitizar entrada
app.use(customSecurityHeaders); // Headers customizados
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Criar diretórios necessários
const createDirectories = async () => {
    const directories = [
        path.join(__dirname, 'uploads'),
        path.join(__dirname, 'logs'),
        path.join(__dirname, 'sessions')
    ];

    for (const dir of directories) {
        try {
            await fs.promises.mkdir(dir, { recursive: true });
            logger.info(`Diretório criado/verificado: ${dir}`);
        } catch (error) {
            logger.error(`Erro ao criar diretório ${dir}: ${error.message}`);
        }
    }
};

// Rota de health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AtendeZap API - Sistema de Atendimento WhatsApp',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            channels: '/api/channels',
            messages: '/api/messages',
            webhooks: '/api/webhooks',
            quickReplies: '/api/quick-replies'
        }
    });
});

app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRateLimit, messageRoutes);
app.use('/api/webhooks', webhookRateLimit, webhookRoutes);
app.use('/api/quick-replies', authRateLimit, quickReplyRoutes);

// Middleware para rotas não encontradas
app.use(notFound);

// Middleware de tratamento de erros
app.use(errorHandler);

// Função para inicializar o servidor
const startServer = async () => {
    try {
        // Criar diretórios necessários
        await createDirectories();

        // Testar conexão com banco de dados com retry
        logger.info('Testando conexão com banco de dados PostgreSQL...');
        logger.info(`Configuração de conexão: Host=${process.env.DB_HOST}, Port=${process.env.DB_PORT}, Database=${process.env.DB_NAME}, User=${process.env.DB_USER}`);
        
        let retries = 0;
        const maxRetries = 15; // Aumentado para 15 tentativas
        const baseDelay = 3000; // Aumentado para 3 segundos
        
        while (retries < maxRetries) {
            try {
                logger.info(`Tentativa ${retries + 1}/${maxRetries} de conexão com PostgreSQL...`);
                await db.query('SELECT NOW() as current_time');
                logger.info('✅ Conexão com banco de dados PostgreSQL estabelecida com sucesso!');
                break;
            } catch (error) {
                retries++;
                const delay = Math.min(baseDelay * Math.pow(1.5, retries - 1), 30000); // Máximo 30s
                logger.error(`❌ Tentativa ${retries}/${maxRetries} falhou:`);
                logger.error(`   Erro: ${error.message}`);
                logger.error(`   Código: ${error.code}`);
                logger.error(`   Host tentado: ${error.hostname || 'N/A'}`);
                logger.error(`   Porta tentada: ${error.port || 'N/A'}`);
                
                if (retries >= maxRetries) {
                    logger.error('🚨 Máximo de tentativas de conexão excedido!');
                    logger.error('Verifique se o PostgreSQL está rodando e acessível na rede Docker.');
                    throw error;
                }
                
                logger.info(`⏳ Aguardando ${Math.round(delay/1000)}s antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        logger.info('Continuando inicialização do servidor...');

        // Executar migrações PostgreSQL se necessário
        if (process.env.AUTO_MIGRATE === 'true') {
            logger.info('Executando migrações PostgreSQL automáticas...');
            try {
                execSync('node database/migrate.js run', { cwd: __dirname });
                logger.info('Migrações PostgreSQL executadas com sucesso');
            } catch (error) {
                logger.warn(`Erro nas migrações PostgreSQL: ${error.message}`);
            }
        }

        // Inicializar SessionManager
        logger.info('Inicializando SessionManager...');
        await SessionManager.initialize();
        logger.info('SessionManager inicializado');
        logger.info('Preparando para iniciar servidor HTTP...');

        // Iniciar servidor
        const server = app.listen(PORT, () => {
            logger.info(`Servidor rodando na porta ${PORT}`);
            logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Health check: http://localhost:${PORT}/health`);
            logger.info(`API Base: http://localhost:${PORT}/api`);
        });

        // Configurar timeout do servidor
        server.timeout = 30000; // 30 segundos

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`Recebido sinal ${signal}. Iniciando shutdown graceful...`);
            
            server.close(async () => {
                logger.info('Servidor HTTP fechado');
                
                try {
                    // Parar todas as sessões ativas
                    logger.info('Parando sessões ativas...');
                    await SessionManager.getInstance().cleanup();
                    
                    // Fechar conexão com banco de dados
                    logger.info('Fechando conexão com banco de dados...');
                    await db.closePool();
                    
                    logger.info('Shutdown concluído com sucesso');
                    process.exit(0);
                } catch (error) {
                    logger.error(`Erro durante shutdown: ${error.message}`);
                    process.exit(1);
                }
            });
        };

        // Capturar sinais de shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Capturar erros não tratados
        process.on('uncaughtException', (error) => {
            logger.error('Erro não capturado:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Promise rejeitada não tratada:', { reason, promise });
            process.exit(1);
        });

        return server;
    } catch (error) {
        logger.error(`Erro ao iniciar servidor: ${error.message}`);
        process.exit(1);
    }
};

// Iniciar servidor
startServer();

export { app, startServer };
