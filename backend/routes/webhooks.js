import express from 'express';
import WebhookController from '../controllers/WebhookController.js';
import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

const router = express.Router();

// Rate limiting para webhooks
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // máximo 100 webhooks por minuto por IP
    message: {
        success: false,
        message: 'Limite de webhooks excedido'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Pular rate limiting para IPs locais em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
            const localIPs = ['127.0.0.1', '::1', 'localhost'];
            return localIPs.includes(req.ip);
        }
        return false;
    }
});

// Middleware para validar UUIDs
const validateUUID = (paramName) => (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(value)) {
        return res.status(400).json({
            success: false,
            message: `${paramName} inválido`
        });
    }
    
    next();
};

// Middleware para logging de webhooks
const logWebhook = (req, res, next) => {
    const startTime = Date.now();
    
    // Log da requisição
    logger.info('Webhook recebido:', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length')
    });
    
    // Override do res.json para logar a resposta
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        logger.info('Webhook processado:', {
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            success: data?.success || false
        });
        return originalJson.call(this, data);
    };
    
    next();
};

// Middleware para validar content-type JSON
const validateJsonContent = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentType = req.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({
                success: false,
                message: 'Content-Type deve ser application/json'
            });
        }
    }
    next();
};

// Aplicar middlewares globais
router.use(webhookLimiter);
router.use(logWebhook);
router.use(validateJsonContent);

/**
 * @route POST /api/webhooks/evolution
 * @desc Webhook para receber eventos da API Evolution
 * @access Public (mas deve ser protegido por IP/token em produção)
 */
router.post('/evolution', WebhookController.evolutionWebhook);

/**
 * @route POST /api/webhooks/channel/:channelId
 * @desc Webhook genérico para receber eventos de um canal específico
 * @access Public (mas deve ser protegido por IP/token em produção)
 */
router.post('/channel/:channelId', 
    validateUUID('channelId'),
    WebhookController.genericWebhook
);

/**
 * @route POST /api/webhooks/baileys/:channelId
 * @desc Webhook específico para Baileys
 * @access Public (mas deve ser protegido por IP/token em produção)
 */
router.post('/baileys/:channelId', 
    validateUUID('channelId'),
    (req, res, next) => {
        // Adicionar identificador da API no request
        req.apiType = 'baileys';
        next();
    },
    WebhookController.genericWebhook
);

/**
 * @route POST /api/webhooks/webjs/:channelId
 * @desc Webhook específico para Web.js
 * @access Public (mas deve ser protegido por IP/token em produção)
 */
router.post('/webjs/:channelId', 
    validateUUID('channelId'),
    (req, res, next) => {
        // Adicionar identificador da API no request
        req.apiType = 'webjs';
        next();
    },
    WebhookController.genericWebhook
);

/**
 * @route POST /api/webhooks/test
 * @desc Webhook de teste para desenvolvimento
 * @access Public
 */
router.post('/test', WebhookController.testWebhook);

/**
 * @route GET /api/webhooks/test
 * @desc Endpoint de teste para verificar se o serviço está funcionando
 * @access Public
 */
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Serviço de webhooks funcionando',
        timestamp: new Date().toISOString(),
        endpoints: {
            evolution: '/api/webhooks/evolution',
            generic: '/api/webhooks/channel/:channelId',
            baileys: '/api/webhooks/baileys/:channelId',
            webjs: '/api/webhooks/webjs/:channelId',
            test: '/api/webhooks/test'
        }
    });
});

/**
 * @route GET /api/webhooks/health
 * @desc Health check específico para webhooks
 * @access Public
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'webhooks',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Middleware para capturar rotas não encontradas nos webhooks
router.use('*', (req, res) => {
    logger.warn(`Webhook não encontrado: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'Endpoint de webhook não encontrado',
        availableEndpoints: {
            evolution: 'POST /api/webhooks/evolution',
            generic: 'POST /api/webhooks/channel/:channelId',
            baileys: 'POST /api/webhooks/baileys/:channelId',
            webjs: 'POST /api/webhooks/webjs/:channelId',
            test: 'POST /api/webhooks/test'
        }
    });
});

export default router;