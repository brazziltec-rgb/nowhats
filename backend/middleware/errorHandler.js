import logger from '../config/logger.js';

/**
 * Middleware principal de tratamento de erros
 */
const errorHandler = (err, req, res, next) => {
    // Log do erro
    logger.error('Erro capturado pelo middleware:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        body: req.method !== 'GET' ? req.body : undefined
    });

    // Objeto de erro padrão
    let error = {
        success: false,
        message: err.message || 'Erro interno do servidor',
        statusCode: err.statusCode || 500
    };

    // Erros de validação do express-validator
    if (err.name === 'ValidationError' && err.array) {
        error = {
            success: false,
            message: 'Dados de entrada inválidos',
            statusCode: 400,
            errors: err.array()
        };
    }

    // Erros do PostgreSQL
    if (err.code) {
        switch (err.code) {
            case '23505': // Violação de unicidade
                error = {
                    success: false,
                    message: 'Recurso já existe',
                    statusCode: 409,
                    field: extractFieldFromPgError(err)
                };
                break;

            case '23503': // Violação de chave estrangeira
                error = {
                    success: false,
                    message: 'Referência inválida',
                    statusCode: 400,
                    field: extractFieldFromPgError(err)
                };
                break;

            case '23502': // Violação de NOT NULL
                error = {
                    success: false,
                    message: 'Campo obrigatório não fornecido',
                    statusCode: 400,
                    field: extractFieldFromPgError(err)
                };
                break;

            case '23514': // Violação de CHECK constraint
                error = {
                    success: false,
                    message: 'Valor inválido para o campo',
                    statusCode: 400,
                    field: extractFieldFromPgError(err)
                };
                break;

            case '42P01': // Tabela não existe
                error = {
                    success: false,
                    message: 'Recurso não encontrado',
                    statusCode: 404
                };
                break;

            case '42703': // Coluna não existe
                error = {
                    success: false,
                    message: 'Campo não encontrado',
                    statusCode: 400
                };
                break;

            case '08006': // Falha na conexão
            case '08001': // Não foi possível estabelecer conexão
                error = {
                    success: false,
                    message: 'Erro de conexão com o banco de dados',
                    statusCode: 503
                };
                break;

            default:
                error = {
                    success: false,
                    message: 'Erro no banco de dados',
                    statusCode: 500
                };
        }
    }

    // Erros de JWT
    if (err.name === 'JsonWebTokenError') {
        error = {
            success: false,
            message: 'Token inválido',
            statusCode: 401
        };
    }

    if (err.name === 'TokenExpiredError') {
        error = {
            success: false,
            message: 'Token expirado',
            statusCode: 401
        };
    }

    // Erros de sintaxe JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        error = {
            success: false,
            message: 'JSON inválido',
            statusCode: 400
        };
    }

    // Erros de cast (IDs inválidos)
    if (err.name === 'CastError') {
        error = {
            success: false,
            message: 'ID inválido',
            statusCode: 400,
            field: err.path
        };
    }

    // Erros de timeout
    if (err.code === 'ETIMEDOUT' || err.timeout) {
        error = {
            success: false,
            message: 'Timeout na operação',
            statusCode: 408
        };
    }

    // Erros de limite de tamanho
    if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FIELD_VALUE') {
        error = {
            success: false,
            message: 'Arquivo ou campo muito grande',
            statusCode: 413
        };
    }

    // Erros customizados da aplicação
    if (err.isOperational) {
        error = {
            success: false,
            message: err.message,
            statusCode: err.statusCode || 400,
            code: err.code
        };
    }

    // Adicionar stack trace em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        error.stack = err.stack;
        error.originalError = err;
    }

    // Responder com o erro
    res.status(error.statusCode).json(error);
};

/**
 * Middleware para capturar rotas não encontradas
 */
const notFound = (req, res, next) => {
    const error = new Error(`Rota não encontrada - ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    
    logger.warn('Rota não encontrada:', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    next(error);
};

/**
 * Wrapper para funções assíncronas
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware para logar requests
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Gerar ID único para o request
    req.id = generateRequestId();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            id: req.id,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id,
            contentLength: res.get('Content-Length')
        };
        
        if (res.statusCode >= 400) {
            logger.warn('HTTP Request (Error):', logData);
        } else {
            logger.info('HTTP Request:', logData);
        }
    });
    
    next();
};

/**
 * Classe para erros customizados da aplicação
 */
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Funções auxiliares
 */

// Extrair nome do campo de erros do PostgreSQL
function extractFieldFromPgError(err) {
    if (err.detail) {
        const match = err.detail.match(/Key \(([^)]+)\)/);
        if (match) {
            return match[1];
        }
    }
    
    if (err.column) {
        return err.column;
    }
    
    return null;
}

// Gerar ID único para requests
function generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

/**
 * Middleware para validar content-type em requests POST/PUT
 */
const validateContentType = (expectedType = 'application/json') => {
    return (req, res, next) => {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return next();
        }
        
        const contentType = req.get('Content-Type');
        
        if (!contentType || !contentType.includes(expectedType)) {
            const error = new AppError(
                `Content-Type deve ser ${expectedType}`,
                400,
                'INVALID_CONTENT_TYPE'
            );
            return next(error);
        }
        
        next();
    };
};

/**
 * Middleware para timeout de requests
 */
const requestTimeout = (timeout = 30000) => {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            const error = new AppError(
                'Request timeout',
                408,
                'REQUEST_TIMEOUT'
            );
            next(error);
        }, timeout);
        
        res.on('finish', () => {
            clearTimeout(timer);
        });
        
        next();
    };
};

export {
    errorHandler,
    notFound,
    asyncHandler,
    requestLogger,
    AppError,
    validateContentType,
    requestTimeout
};