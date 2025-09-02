import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { body, param, query } from 'express-validator';
import QuickReply from '../models/QuickReply.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

// Validações
const validateQuickReplyId = [
    param('id').isUUID().withMessage('ID deve ser um UUID válido')
];

const createQuickReplyValidation = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Título é obrigatório e deve ter entre 1 e 100 caracteres'),
    body('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Conteúdo é obrigatório e deve ter entre 1 e 1000 caracteres'),
    body('shortcut')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Atalho deve ter no máximo 20 caracteres'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Categoria deve ter no máximo 50 caracteres')
];

const updateQuickReplyValidation = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Título deve ter entre 1 e 100 caracteres'),
    body('content')
        .optional()
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Conteúdo deve ter entre 1 e 1000 caracteres'),
    body('shortcut')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Atalho deve ter no máximo 20 caracteres'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Categoria deve ter no máximo 50 caracteres')
];

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/quick-replies
 * @desc Listar todas as respostas rápidas do usuário
 * @access Private
 */
router.get('/', asyncHandler(async (req, res) => {
    const { category, search, limit = 50, offset = 0 } = req.query;
    
    try {
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            category,
            search
        };
        
        const quickReplies = await QuickReply.findByUserId(req.user.id, options);
        
        res.json({
            success: true,
            data: quickReplies.map(reply => reply.toJSON())
        });
    } catch (error) {
        logger.error('Erro ao buscar respostas rápidas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
}));

/**
 * @route POST /api/quick-replies
 * @desc Criar nova resposta rápida
 * @access Private
 */
router.post('/', 
    createQuickReplyValidation,
    validateRequest,
    asyncHandler(async (req, res) => {
        const { title, content, shortcut, category } = req.body;
        
        try {
            // Verificar se já existe um atalho igual para este usuário
            if (shortcut) {
                const existingReply = await QuickReply.findByShortcut(shortcut, req.user.id);
                if (existingReply) {
                    return res.status(400).json({
                        success: false,
                        message: 'Já existe uma resposta rápida com este atalho'
                    });
                }
            }
            
            const quickReplyData = {
                user_id: req.user.id,
                title,
                content,
                shortcut,
                category: category || 'general'
            };
            
            const quickReply = await QuickReply.create(quickReplyData);
            
            logger.info(`Resposta rápida criada: ${quickReply.title} para usuário ${req.user.email}`);
            
            res.status(201).json({
                success: true,
                message: 'Resposta rápida criada com sucesso',
                data: quickReply.toJSON()
            });
        } catch (error) {
            logger.error('Erro ao criar resposta rápida:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    })
);

/**
 * @route GET /api/quick-replies/:id
 * @desc Obter resposta rápida específica
 * @access Private
 */
router.get('/:id', 
    validateQuickReplyId,
    validateRequest,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        try {
            const quickReply = await QuickReply.findById(id);
            
            if (!quickReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Resposta rápida não encontrada'
                });
            }
            
            // Verificar se pertence ao usuário
            if (quickReply.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }
            
            res.json({
                success: true,
                data: quickReply.toJSON()
            });
        } catch (error) {
            logger.error('Erro ao buscar resposta rápida:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    })
);

/**
 * @route PUT /api/quick-replies/:id
 * @desc Atualizar resposta rápida
 * @access Private
 */
router.put('/:id', 
    validateQuickReplyId,
    updateQuickReplyValidation,
    validateRequest,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { title, content, shortcut, category } = req.body;
        
        try {
            const quickReply = await QuickReply.findById(id);
            
            if (!quickReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Resposta rápida não encontrada'
                });
            }
            
            // Verificar se pertence ao usuário
            if (quickReply.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }
            
            // Verificar se o novo atalho já existe (se fornecido)
            if (shortcut && shortcut !== quickReply.shortcut) {
                const existingReply = await QuickReply.findByShortcut(shortcut, req.user.id);
                if (existingReply) {
                    return res.status(400).json({
                        success: false,
                        message: 'Já existe uma resposta rápida com este atalho'
                    });
                }
            }
            
            const updateData = {};
            if (title !== undefined) updateData.title = title;
            if (content !== undefined) updateData.content = content;
            if (shortcut !== undefined) updateData.shortcut = shortcut;
            if (category !== undefined) updateData.category = category;
            
            const updatedQuickReply = await quickReply.update(updateData);
            
            logger.info(`Resposta rápida atualizada: ${updatedQuickReply.title} para usuário ${req.user.email}`);
            
            res.json({
                success: true,
                message: 'Resposta rápida atualizada com sucesso',
                data: updatedQuickReply.toJSON()
            });
        } catch (error) {
            logger.error('Erro ao atualizar resposta rápida:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    })
);

/**
 * @route DELETE /api/quick-replies/:id
 * @desc Deletar resposta rápida
 * @access Private
 */
router.delete('/:id', 
    validateQuickReplyId,
    validateRequest,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        try {
            const quickReply = await QuickReply.findById(id);
            
            if (!quickReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Resposta rápida não encontrada'
                });
            }
            
            // Verificar se pertence ao usuário
            if (quickReply.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }
            
            await quickReply.delete();
            
            logger.info(`Resposta rápida deletada: ${quickReply.title} para usuário ${req.user.email}`);
            
            res.json({
                success: true,
                message: 'Resposta rápida deletada com sucesso'
            });
        } catch (error) {
            logger.error('Erro ao deletar resposta rápida:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    })
);

/**
 * @route GET /api/quick-replies/search
 * @desc Buscar respostas rápidas
 * @access Private
 */
router.get('/search', asyncHandler(async (req, res) => {
    const { q: searchTerm, category, limit = 20 } = req.query;
    
    if (!searchTerm) {
        return res.status(400).json({
            success: false,
            message: 'Termo de busca é obrigatório'
        });
    }
    
    try {
        const options = {
            limit: parseInt(limit),
            category
        };
        
        const quickReplies = await QuickReply.search(req.user.id, searchTerm, options);
        
        res.json({
            success: true,
            data: quickReplies.map(reply => reply.toJSON())
        });
    } catch (error) {
        logger.error('Erro ao buscar respostas rápidas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
}));

/**
 * @route GET /api/quick-replies/stats
 * @desc Obter estatísticas das respostas rápidas
 * @access Private
 */
router.get('/stats', asyncHandler(async (req, res) => {
    try {
        const stats = await QuickReply.getStats(req.user.id);
        
        res.json({
            success: true,
            data: {
                total_replies: parseInt(stats.total_replies),
                total_categories: parseInt(stats.total_categories),
                with_shortcuts: parseInt(stats.with_shortcuts),
                avg_content_length: parseFloat(stats.avg_content_length) || 0
            }
        });
    } catch (error) {
        logger.error('Erro ao obter estatísticas das respostas rápidas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
}));

export default router;