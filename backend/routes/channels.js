import express from 'express';
import ChannelController from '../controllers/ChannelController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest, channelValidation } from '../middleware/validation.js';

const router = express.Router();

// Validação de parâmetros

// Middleware para validar UUID
const validateChannelId = (req, res, next) => {
    const { channelId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(channelId)) {
        return res.status(400).json({
            success: false,
            message: 'ID do canal inválido'
        });
    }
    
    next();
};

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route GET /api/channels
 * @desc Listar todos os canais do usuário
 * @access Private
 */
router.get('/', ChannelController.getChannels);

/**
 * @route POST /api/channels
 * @desc Criar novo canal
 * @access Private
 */
router.post('/', 
    channelValidation.create,
    validateRequest,
    ChannelController.createChannel
);

/**
 * @route POST /api/channels/create-and-connect
 * @desc Criar novo canal e conectar automaticamente (Nova Conexão)
 * @access Private
 */
router.post('/create-and-connect', 
    channelValidation.create,
    validateRequest,
    ChannelController.createAndConnect
);

/**
 * @route GET /api/channels/:channelId
 * @desc Obter canal específico
 * @access Private
 */
router.get('/:channelId', 
    validateChannelId,
    ChannelController.getChannel
);

/**
 * @route PUT /api/channels/:channelId
 * @desc Atualizar canal
 * @access Private
 */
router.put('/:channelId', 
    validateChannelId,
    channelValidation.update,
    validateRequest,
    ChannelController.updateChannel
);

/**
 * @route DELETE /api/channels/:channelId
 * @desc Deletar canal
 * @access Private
 */
router.delete('/:channelId', 
    validateChannelId,
    ChannelController.deleteChannel
);

/**
 * @route POST /api/channels/:channelId/connect
 * @desc Conectar canal ao WhatsApp
 * @access Private
 */
router.post('/:channelId/connect', 
    validateChannelId,
    ChannelController.connectChannel
);

/**
 * @route POST /api/channels/:channelId/disconnect
 * @desc Desconectar canal do WhatsApp
 * @access Private
 */
router.post('/:channelId/disconnect', 
    validateChannelId,
    ChannelController.disconnectChannel
);

/**
 * @route POST /api/channels/:channelId/restart
 * @desc Reiniciar conexão do canal
 * @access Private
 */
router.post('/:channelId/restart', 
    validateChannelId,
    ChannelController.restartChannel
);

/**
 * @route GET /api/channels/:channelId/qr
 * @desc Obter QR Code para conexão
 * @access Private
 */
router.get('/:channelId/qr', 
    validateChannelId,
    ChannelController.getQRCode
);

/**
 * @route GET /api/channels/:channelId/status
 * @desc Obter status da sessão do canal
 * @access Private
 */
router.get('/:channelId/status', 
    validateChannelId,
    ChannelController.getSessionStatus
);

export default router;