import express from 'express';
import MessageController from '../controllers/MessageController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, messageValidation } from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting para envio de mensagens
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // máximo 30 mensagens por minuto
    message: {
        success: false,
        message: 'Limite de mensagens excedido. Tente novamente em 1 minuto.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const bulkMessageLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // máximo 3 envios em massa por 5 minutos
    message: {
        success: false,
        message: 'Limite de envios em massa excedido. Tente novamente em 5 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Validação de parâmetros

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

// Middleware para validar parâmetros de paginação
const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;
    
    if (page && (isNaN(page) || parseInt(page) < 1)) {
        return res.status(400).json({
            success: false,
            message: 'Página deve ser um número maior que 0'
        });
    }
    
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return res.status(400).json({
            success: false,
            message: 'Limite deve ser um número entre 1 e 100'
        });
    }
    
    next();
};

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route POST /api/messages/send
 * @desc Enviar mensagem de texto
 * @access Private
 */
router.post('/send', 
    messageLimiter,
    messageValidation.sendText,
    validateRequest,
    MessageController.sendTextMessage
);

/**
 * @route POST /api/messages/send-media
 * @desc Enviar mensagem com mídia
 * @access Private
 */
router.post('/send-media', 
    messageLimiter,
    MessageController.sendMediaMessage
);

/**
 * @route POST /api/messages/bulk
 * @desc Enviar mensagens em massa
 * @access Private
 */
router.post('/bulk', 
    bulkMessageLimiter,
    messageValidation.sendBulk,
    validateRequest,
    MessageController.sendBulkMessages
);

/**
 * @route GET /api/messages/ticket/:ticketId
 * @desc Listar mensagens de um ticket
 * @access Private
 */
router.get('/ticket/:ticketId', 
    validateUUID('ticketId'),
    validatePagination,
    MessageController.getMessages
);

/**
 * @route GET /api/messages/search
 * @desc Buscar mensagens
 * @access Private
 */
router.get('/search', 
    validatePagination,
    MessageController.searchMessages
);

/**
 * @route GET /api/messages/stats
 * @desc Obter estatísticas de mensagens
 * @access Private
 */
router.get('/stats', MessageController.getMessageStats);

/**
 * @route PUT /api/messages/:messageId/read
 * @desc Marcar mensagem como lida
 * @access Private
 */
router.put('/:messageId/read', 
    validateUUID('messageId'),
    MessageController.markAsRead
);

export default router;