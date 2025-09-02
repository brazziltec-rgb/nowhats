import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, authValidation } from '../middleware/validation.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting para rotas de autenticação
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas por IP
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 registros por IP por hora
    message: {
        success: false,
        message: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rotas de autenticação

// Rotas públicas
/**
 * @route POST /api/auth/register
 * @desc Registrar novo usuário
 * @access Public
 */
router.post('/register', 
    registerLimiter,
    authValidation.register,
    validateRequest,
    AuthController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login de usuário
 * @access Public
 */
router.post('/login', 
    authLimiter,
    authValidation.login,
    validateRequest,
    AuthController.login
);

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token de acesso
 * @access Public
 */
router.post('/refresh', 
    authValidation.refreshToken,
    validateRequest,
    AuthController.refreshToken
);

/**
 * @route GET /api/auth/check-email
 * @desc Verificar disponibilidade de email
 * @access Public
 */
router.get('/check-email', AuthController.checkEmail);

// Rotas protegidas
/**
 * @route POST /api/auth/logout
 * @desc Logout de usuário
 * @access Private
 */
router.post('/logout', 
    authenticateToken,
    AuthController.logout
);

/**
 * @route GET /api/auth/profile
 * @desc Obter perfil do usuário atual
 * @access Private
 */
router.get('/profile', 
    authenticateToken,
    AuthController.getProfile
);

/**
 * @route PUT /api/auth/profile
 * @desc Atualizar perfil do usuário
 * @access Private
 */
router.put('/profile', 
    authenticateToken,
    authValidation.updateProfile,
    validateRequest,
    AuthController.updateProfile
);

/**
 * @route PUT /api/auth/change-password
 * @desc Alterar senha do usuário
 * @access Private
 */
router.put('/change-password', 
    authenticateToken,
    authValidation.changePassword,
    validateRequest,
    AuthController.changePassword
);

export default router;