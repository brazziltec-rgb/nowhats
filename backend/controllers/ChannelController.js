import Channel from '../models/Channel.js';
import SessionManager from '../services/SessionManager.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';

class ChannelController {
    // Listar canais do usuário
    static getChannels = asyncHandler(async (req, res) => {
        try {
            const channels = await Channel.findByUserId(req.user.id);
            
            // Adicionar status atual de cada canal
            const channelsWithStatus = await Promise.all(
                channels.map(async (channel) => {
                    const sessionStatus = SessionManager.getSessionStatus(channel.id);
                    return {
                        ...channel.toJSON(),
                        sessionStatus
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    channels: channelsWithStatus
                }
            });
        } catch (error) {
            logger.error(`Erro ao listar canais: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Criar novo canal
    static createChannel = asyncHandler(async (req, res) => {
        const { name, api } = req.body;

        // Validar dados obrigatórios
        if (!name || !api) {
            return res.status(400).json({
                success: false,
                message: 'Nome e API são obrigatórios'
            });
        }

        // Validar API suportada
        const supportedApis = ['baileys', 'evolution', 'webjs'];
        if (!supportedApis.includes(api)) {
            return res.status(400).json({
                success: false,
                message: `API não suportada. APIs disponíveis: ${supportedApis.join(', ')}`
            });
        }

        try {
            // Criar canal
            const channelData = {
                user_id: req.user.id,
                name,
                api,
                status: 'disconnected'
            };

            const channel = await Channel.create(channelData);

            logger.info(`Canal criado: ${channel.name} (${channel.api}) para usuário ${req.user.email}`);

            res.status(201).json({
                success: true,
                message: 'Canal criado com sucesso',
                data: {
                    channel: channel.toJSON()
                }
            });
        } catch (error) {
            logger.error(`Erro ao criar canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Obter canal específico
    static getChannel = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Adicionar status da sessão
            const sessionStatus = SessionManager.getSessionStatus(channel.id);
            const channelWithStatus = {
                ...channel.toJSON(),
                sessionStatus
            };

            res.json({
                success: true,
                data: {
                    channel: channelWithStatus
                }
            });
        } catch (error) {
            logger.error(`Erro ao obter canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Conectar canal
    static connectChannel = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Verificar se já está conectado
            const sessionStatus = SessionManager.getSessionStatus(channelId);
            if (sessionStatus && sessionStatus.status === 'connected') {
                return res.status(400).json({
                    success: false,
                    message: 'Canal já está conectado'
                });
            }

            // Iniciar sessão
            const result = await SessionManager.createSession(channelId, req.user.id, channel.api);
            
            if (result.success) {
                await Channel.updateStatus(channelId, 'connecting');
                
                logger.info(`Conexão iniciada para canal ${channel.name} (${channel.api})`);
                
                res.json({
                    success: true,
                    message: 'Conexão iniciada com sucesso',
                    data: {
                        channelId,
                        status: 'connecting'
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message || 'Erro ao iniciar conexão'
                });
            }
        } catch (error) {
            logger.error(`Erro ao conectar canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Criar canal e conectar automaticamente (Nova Conexão)
    static createAndConnect = asyncHandler(async (req, res) => {
        const { name, api } = req.body;

        // Validar dados obrigatórios
        if (!name || !api) {
            return res.status(400).json({
                success: false,
                message: 'Nome e API são obrigatórios'
            });
        }

        // Validar API suportada
        const supportedApis = ['baileys', 'evolution', 'webjs'];
        if (!supportedApis.includes(api)) {
            return res.status(400).json({
                success: false,
                message: `API não suportada. APIs disponíveis: ${supportedApis.join(', ')}`
            });
        }

        try {
            // Criar canal
            const channelData = {
                name,
                api,
                user_id: req.user.id,
                status: 'inactive'
            };

            const channel = await Channel.create(channelData);
            
            if (!channel) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao criar canal'
                });
            }

            logger.info(`Canal criado: ${channel.name} (${channel.api}) - ID: ${channel.id}`);

            // Iniciar sessão automaticamente
            const result = await SessionManager.createSession(channel.id, req.user.id, channel.api);
            
            if (result.success) {
                await Channel.updateStatus(channel.id, 'connecting');
                
                logger.info(`Conexão iniciada automaticamente para canal ${channel.name} (${channel.api})`);
                
                res.status(201).json({
                    success: true,
                    message: 'Canal criado e conexão iniciada com sucesso',
                    data: {
                        channel: {
                            id: channel.id,
                            name: channel.name,
                            api: channel.api,
                            status: 'connecting',
                            created_at: channel.created_at
                        }
                    }
                });
            } else {
                // Se falhar na conexão, manter o canal mas com status de erro
                await Channel.updateStatus(channel.id, 'error');
                
                res.status(201).json({
                    success: true,
                    message: 'Canal criado, mas houve erro na conexão',
                    data: {
                        channel: {
                            id: channel.id,
                            name: channel.name,
                            api: channel.api,
                            status: 'error',
                            created_at: channel.created_at
                        },
                        connectionError: result.message
                    }
                });
            }
        } catch (error) {
            logger.error(`Erro ao criar canal e conectar: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Desconectar canal
    static disconnectChannel = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Parar sessão
            const result = await SessionManager.stopSession(channelId);
            
            if (result.success) {
                await Channel.updateStatus(channelId, 'disconnected');
                
                logger.info(`Canal desconectado: ${channel.name} (${channel.api})`);
                
                res.json({
                    success: true,
                    message: 'Canal desconectado com sucesso'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message || 'Erro ao desconectar canal'
                });
            }
        } catch (error) {
            logger.error(`Erro ao desconectar canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Obter QR Code
    static getQRCode = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Obter QR Code da sessão
            const qrCode = await SessionManager.getQRCode(channelId);
            
            if (qrCode) {
                res.json({
                    success: true,
                    data: {
                        qrCode
                    }
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'QR Code não disponível'
                });
            }
        } catch (error) {
            logger.error(`Erro ao obter QR Code: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Atualizar canal
    static updateChannel = asyncHandler(async (req, res) => {
        const { channelId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Nome é obrigatório'
            });
        }

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Atualizar canal
            const updatedChannel = await Channel.update(channelId, { name });
            
            logger.info(`Canal atualizado: ${updatedChannel.name} (${updatedChannel.api})`);
            
            res.json({
                success: true,
                message: 'Canal atualizado com sucesso',
                data: {
                    channel: updatedChannel.toJSON()
                }
            });
        } catch (error) {
            logger.error(`Erro ao atualizar canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Deletar canal
    static deleteChannel = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Parar sessão se estiver ativa
            try {
                await SessionManager.stopSession(channelId);
            } catch (error) {
                logger.warn(`Erro ao parar sessão antes de deletar canal: ${error.message}`);
            }

            // Deletar canal
            await Channel.delete(channelId);
            
            logger.info(`Canal deletado: ${channel.name} (${channel.api})`);
            
            res.json({
                success: true,
                message: 'Canal deletado com sucesso'
            });
        } catch (error) {
            logger.error(`Erro ao deletar canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Obter status da sessão
    static getSessionStatus = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const sessionStatus = SessionManager.getSessionStatus(channelId);
            
            res.json({
                success: true,
                data: {
                    channelId,
                    status: sessionStatus
                }
            });
        } catch (error) {
            logger.error(`Erro ao obter status da sessão: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Reiniciar canal
    static restartChannel = asyncHandler(async (req, res) => {
        const { channelId } = req.params;

        try {
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({
                    success: false,
                    message: 'Canal não encontrado'
                });
            }

            // Verificar se o canal pertence ao usuário
            if (channel.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Reiniciar sessão
            const result = await SessionManager.restartSession(channelId);
            
            if (result.success) {
                await Channel.updateStatus(channelId, 'connecting');
                
                logger.info(`Canal reiniciado: ${channel.name} (${channel.api})`);
                
                res.json({
                    success: true,
                    message: 'Canal reiniciado com sucesso'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message || 'Erro ao reiniciar canal'
                });
            }
        } catch (error) {
            logger.error(`Erro ao reiniciar canal: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });
}

export default ChannelController;