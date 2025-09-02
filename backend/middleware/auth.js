import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';
import { promisify } from 'util';

/**
 * Middleware para autenticar token JWT
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso requerido'
            });
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuário no banco de dados
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Usuário inativo'
            });
        }

        // Adicionar usuário ao request
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            is_active: user.is_active
        };

        next();
    } catch (error) {
        logger.error('Erro na autenticação:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

/**
 * Middleware para verificar se o usuário é proprietário do recurso
 */
const checkResourceOwnership = (resourceModel, resourceIdParam = 'id', userIdField = 'user_id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[resourceIdParam];
            const userId = req.user.id;

            // Buscar o recurso
            const resource = await resourceModel.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Recurso não encontrado'
                });
            }

            // Verificar se o usuário é o proprietário
            if (resource[userIdField] !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado: você não tem permissão para acessar este recurso'
                });
            }

            // Adicionar recurso ao request para uso posterior
            req.resource = resource;
            next();
        } catch (error) {
            logger.error('Erro na verificação de propriedade:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    };
};

/**
 * Middleware para verificar permissões específicas
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            // Por enquanto, todos os usuários ativos têm todas as permissões
            // Futuramente pode ser implementado um sistema de roles/permissões
            if (!user || !user.is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'Permissão insuficiente'
                });
            }

            next();
        } catch (error) {
            logger.error('Erro na verificação de permissão:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    };
};

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && user.is_active) {
            req.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                is_active: user.is_active
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // Em caso de erro, continua sem usuário autenticado
        req.user = null;
        next();
    }
};

/**
 * Gerar token JWT
 */
const generateToken = (userId, expiresIn = '24h') => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

/**
 * Gerar refresh token
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Verificar refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        
        if (decoded.type !== 'refresh') {
            throw new Error('Token inválido');
        }
        
        return decoded;
    } catch (error) {
        throw new Error('Refresh token inválido');
    }
};

/**
 * Middleware para validar UUID
 */
const validateUUID = (paramName = 'id') => {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(uuid)) {
            return res.status(400).json({
                success: false,
                message: `ID inválido: ${paramName} deve ser um UUID válido`
            });
        }
        
        next();
    };
};

export {
    authenticateToken,
    checkResourceOwnership,
    requirePermission,
    optionalAuth,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    validateUUID
};