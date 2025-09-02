import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import logger from '../config/logger.js';

/**
 * Configuração de segurança com Helmet
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

/**
 * Rate limiting para API geral
 */
const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP por janela
    message: {
        success: false,
        message: 'Muitas tentativas. Tente novamente em 15 minutos.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit excedido - API geral:', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
            success: false,
            message: 'Muitas tentativas. Tente novamente em 15 minutos.',
            retryAfter: 15 * 60
        });
    }
});

/**
 * Rate limiting para autenticação (mais restritivo)
 */
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas de login por IP por janela
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        logger.warn('Rate limit excedido - Autenticação:', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent'),
            email: req.body?.email
        });
        
        res.status(429).json({
            success: false,
            message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
            retryAfter: 15 * 60
        });
    }
});

/**
 * Rate limiting para webhooks
 */
const webhookRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 1000, // máximo 1000 webhooks por IP por minuto
    message: {
        success: false,
        message: 'Muitos webhooks. Tente novamente em 1 minuto.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit excedido - Webhooks:', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
            success: false,
            message: 'Muitos webhooks. Tente novamente em 1 minuto.',
            retryAfter: 60
        });
    }
});

/**
 * Rate limiting para envio de mensagens
 */
const messageRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // máximo 30 mensagens por usuário por minuto
    message: {
        success: false,
        message: 'Muitas mensagens enviadas. Tente novamente em 1 minuto.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit por usuário, não por IP
        return req.user?.id || req.ip;
    },
    handler: (req, res) => {
        logger.warn('Rate limit excedido - Mensagens:', {
            userId: req.user?.id,
            ip: req.ip,
            url: req.url
        });
        
        res.status(429).json({
            success: false,
            message: 'Muitas mensagens enviadas. Tente novamente em 1 minuto.',
            retryAfter: 60
        });
    }
});

/**
 * Slow down para requests suspeitos
 */
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutos
    delayAfter: 50, // permitir 50 requests por janela sem delay
    delayMs: (used, req) => {
        const delayAfter = req.slowDown.delayAfter || 50;
        return (used - delayAfter) * 500;
    },
    maxDelayMs: 20000 // máximo 20 segundos de delay
});

/**
 * Middleware para detectar e bloquear IPs suspeitos
 */
const suspiciousActivityDetector = (req, res, next) => {
    const suspiciousPatterns = [
        /\.php$/i,
        /\.asp$/i,
        /\.jsp$/i,
        /wp-admin/i,
        /phpmyadmin/i,
        /admin\.php/i,
        /config\.php/i,
        /\.env$/i,
        /\.git/i,
        /\.svn/i
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(req.url) || pattern.test(req.path)
    );
    
    if (isSuspicious) {
        logger.warn('Atividade suspeita detectada:', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent'),
            headers: req.headers
        });
        
        return res.status(404).json({
            success: false,
            message: 'Recurso não encontrado'
        });
    }
    
    next();
};

/**
 * Middleware para validar User-Agent
 */
const validateUserAgent = (req, res, next) => {
    const userAgent = req.get('User-Agent');
    
    // Bloquear requests sem User-Agent ou com User-Agents suspeitos
    if (!userAgent || userAgent.length < 10) {
        logger.warn('User-Agent suspeito ou ausente:', {
            ip: req.ip,
            url: req.url,
            userAgent: userAgent
        });
        
        return res.status(400).json({
            success: false,
            message: 'User-Agent inválido'
        });
    }
    
    next();
};

/**
 * Middleware para limitar tamanho do body
 */
const bodySizeLimit = (limit = '10mb') => {
    return (req, res, next) => {
        const contentLength = req.get('Content-Length');
        
        if (contentLength) {
            const sizeInMB = parseInt(contentLength) / (1024 * 1024);
            const limitInMB = parseInt(limit);
            
            if (sizeInMB > limitInMB) {
                logger.warn('Body muito grande:', {
                    ip: req.ip,
                    url: req.url,
                    size: `${sizeInMB.toFixed(2)}MB`,
                    limit: limit
                });
                
                return res.status(413).json({
                    success: false,
                    message: `Body muito grande. Máximo permitido: ${limit}`
                });
            }
        }
        
        next();
    };
};

/**
 * Middleware para adicionar headers de segurança customizados
 */
const customSecurityHeaders = (req, res, next) => {
    // Remover headers que revelam informações do servidor
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Adicionar headers de segurança customizados
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Request-ID', req.id || 'unknown');
    
    next();
};

/**
 * Middleware para CORS customizado
 */
const corsHandler = (req, res, next) => {
    const allowedOrigins = [
        process.env.CORS_ORIGIN || 'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:8080'
    ];
    
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
};

export {
    securityHeaders,
    generalRateLimit,
    authRateLimit,
    webhookRateLimit,
    messageRateLimit,
    speedLimiter,
    suspiciousActivityDetector,
    validateUserAgent,
    bodySizeLimit,
    customSecurityHeaders,
    corsHandler
};