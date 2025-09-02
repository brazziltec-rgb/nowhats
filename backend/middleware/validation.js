import { body, param, query, validationResult } from 'express-validator';
import logger from '../config/logger.js';

/**
 * Middleware para processar resultados de validação
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }));
        
        logger.warn('Erro de validação:', { errors: errorMessages, path: req.path });
        
        return res.status(400).json({
            success: false,
            message: 'Dados inválidos',
            errors: errorMessages
        });
    }
    
    next();
};

/**
 * Validações para autenticação
 */
const authValidation = {
    register: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Nome deve ter entre 2 e 255 caracteres')
            .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
            .withMessage('Nome deve conter apenas letras e espaços'),
        
        body('email')
            .trim()
            .isEmail()
            .withMessage('Email deve ser válido')
            .normalizeEmail()
            .isLength({ max: 255 })
            .withMessage('Email deve ter no máximo 255 caracteres'),
        
        body('password')
            .isLength({ min: 6, max: 128 })
            .withMessage('Senha deve ter entre 6 e 128 caracteres')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
        
        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Confirmação de senha não confere');
                }
                return true;
            })
    ],
    
    login: [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Email deve ser válido')
            .normalizeEmail(),
        
        body('password')
            .notEmpty()
            .withMessage('Senha é obrigatória')
    ],
    
    refreshToken: [
        body('refreshToken')
            .notEmpty()
            .withMessage('Refresh token é obrigatório')
    ],
    
    updateProfile: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Nome deve ter entre 2 e 255 caracteres')
            .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
            .withMessage('Nome deve conter apenas letras e espaços'),
        
        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Email deve ser válido')
            .normalizeEmail()
            .isLength({ max: 255 })
            .withMessage('Email deve ter no máximo 255 caracteres')
    ],
    
    changePassword: [
        body('currentPassword')
            .notEmpty()
            .withMessage('Senha atual é obrigatória'),
        
        body('newPassword')
            .isLength({ min: 6, max: 128 })
            .withMessage('Nova senha deve ter entre 6 e 128 caracteres')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
        
        body('confirmNewPassword')
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('Confirmação da nova senha não confere');
                }
                return true;
            })
    ]
};

/**
 * Validações para canais
 */
const channelValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Nome do canal deve ter entre 2 e 255 caracteres')
            .matches(/^[a-zA-Z0-9À-ÿ\s\-_]+$/)
            .withMessage('Nome do canal deve conter apenas letras, números, espaços, hífens e underscores'),
        
        body('api')
            .isIn(['baileys', 'evolution', 'webjs'])
            .withMessage('Tipo de API deve ser: baileys, evolution ou webjs'),
        
        body('api_url')
            .optional()
            .isURL({ require_protocol: true })
            .withMessage('URL da API deve ser válida')
            .isLength({ max: 500 })
            .withMessage('URL da API deve ter no máximo 500 caracteres'),
        
        body('api_key')
            .optional()
            .isLength({ min: 1, max: 255 })
            .withMessage('Chave da API deve ter entre 1 e 255 caracteres'),
        
        body('webhook_url')
            .optional()
            .isURL({ require_protocol: true })
            .withMessage('URL do webhook deve ser válida')
            .isLength({ max: 500 })
            .withMessage('URL do webhook deve ter no máximo 500 caracteres')
    ],
    
    update: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Nome do canal deve ter entre 2 e 255 caracteres')
            .matches(/^[a-zA-Z0-9À-ÿ\s\-_]+$/)
            .withMessage('Nome do canal deve conter apenas letras, números, espaços, hífens e underscores'),
        
        body('api_url')
            .optional()
            .isURL({ require_protocol: true })
            .withMessage('URL da API deve ser válida')
            .isLength({ max: 500 })
            .withMessage('URL da API deve ter no máximo 500 caracteres'),
        
        body('api_key')
            .optional()
            .isLength({ min: 1, max: 255 })
            .withMessage('Chave da API deve ter entre 1 e 255 caracteres'),
        
        body('webhook_url')
            .optional()
            .isURL({ require_protocol: true })
            .withMessage('URL do webhook deve ser válida')
            .isLength({ max: 500 })
            .withMessage('URL do webhook deve ter no máximo 500 caracteres')
    ]
};

/**
 * Validações para mensagens
 */
const messageValidation = {
    sendText: [
        body('to')
            .notEmpty()
            .withMessage('Destinatário é obrigatório')
            .matches(/^\d{10,15}$/)
            .withMessage('Número do destinatário deve conter apenas dígitos (10-15 caracteres)'),
        
        body('message')
            .trim()
            .isLength({ min: 1, max: 4096 })
            .withMessage('Mensagem deve ter entre 1 e 4096 caracteres')
    ],
    
    sendBulk: [
        body('contacts')
            .isArray({ min: 1, max: 1000 })
            .withMessage('Lista de contatos deve ter entre 1 e 1000 itens'),
        
        body('contacts.*.phone')
            .matches(/^\d{10,15}$/)
            .withMessage('Número do telefone deve conter apenas dígitos (10-15 caracteres)'),
        
        body('contacts.*.name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage('Nome deve ter entre 1 e 255 caracteres'),
        
        body('message_template')
            .trim()
            .isLength({ min: 1, max: 4096 })
            .withMessage('Template da mensagem deve ter entre 1 e 4096 caracteres'),
        
        body('delay')
            .optional()
            .isInt({ min: 100, max: 60000 })
            .withMessage('Delay deve ser um número entre 100 e 60000 milissegundos')
    ]
};

/**
 * Validações para parâmetros de URL
 */
const paramValidation = {
    uuid: (paramName = 'id') => [
        param(paramName)
            .isUUID()
            .withMessage(`${paramName} deve ser um UUID válido`)
    ],
    
    phoneNumber: (paramName = 'phone') => [
        param(paramName)
            .matches(/^\d{10,15}$/)
            .withMessage(`${paramName} deve conter apenas dígitos (10-15 caracteres)`)
    ]
};

/**
 * Validações para query parameters
 */
const queryValidation = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1, max: 10000 })
            .withMessage('Página deve ser um número entre 1 e 10000')
            .toInt(),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limite deve ser um número entre 1 e 100')
            .toInt(),
        
        query('sort')
            .optional()
            .isIn(['asc', 'desc'])
            .withMessage('Ordenação deve ser \"asc\" ou \"desc\"')
    ],
    
    search: [
        query('q')
            .optional()
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage('Termo de busca deve ter entre 1 e 255 caracteres')
    ],
    
    dateRange: [
        query('start_date')
            .optional()
            .isISO8601()
            .withMessage('Data inicial deve estar no formato ISO 8601')
            .toDate(),
        
        query('end_date')
            .optional()
            .isISO8601()
            .withMessage('Data final deve estar no formato ISO 8601')
            .toDate()
            .custom((value, { req }) => {
                if (req.query.start_date && value < req.query.start_date) {
                    throw new Error('Data final deve ser posterior à data inicial');
                }
                return true;
            })
    ]
};

/**
 * Middleware para sanitizar dados de entrada
 */
const sanitizeInput = (req, res, next) => {
    // Remover propriedades potencialmente perigosas
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        for (const prop of dangerousProps) {
            delete obj[prop];
        }
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                obj[key] = sanitizeObject(obj[key]);
            }
        }
        
        return obj;
    };
    
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    
    next();
};

/**
 * Middleware para validar content-type
 */
const validateContentType = (expectedType = 'application/json') => {
    return (req, res, next) => {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return next();
        }
        
        const contentType = req.get('Content-Type');
        
        if (!contentType || !contentType.includes(expectedType)) {
            return res.status(400).json({
                success: false,
                message: `Content-Type deve ser ${expectedType}`
            });
        }
        
        next();
    };
};

export {
    validateRequest,
    authValidation,
    channelValidation,
    messageValidation,
    paramValidation,
    queryValidation,
    sanitizeInput,
    validateContentType
};