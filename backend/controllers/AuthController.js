import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';

class AuthController {
    // Registro de usuário
    static register = asyncHandler(async (req, res) => {
        const { name, email, password, phone } = req.body;

        // Validar dados obrigatórios
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios'
            });
        }

        // Validar formato do email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        // Validar força da senha
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter pelo menos 6 caracteres'
            });
        }

        try {
            // Verificar se usuário já existe
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email já está em uso'
                });
            }

            // Criar usuário
            const userData = {
                name,
                email: email.toLowerCase(),
                password,
                phone: phone || null,
                role: 'user',
                is_active: true
            };

            const user = await User.create(userData);

            // Gerar tokens
            const accessToken = generateToken(user.id);
            const refreshTokenValue = generateRefreshToken(user.id);

            logger.info(`Usuário registrado: ${user.email}`);

            res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                data: {
                    user: user.toJSON(),
                    tokens: {
                        accessToken,
                        refreshToken: refreshTokenValue
                    }
                }
            });
        } catch (error) {
            logger.error(`Erro no registro: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Login de usuário
    static login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Validar dados obrigatórios
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios'
            });
        }

        try {
            // Buscar usuário
            const user = await User.findByEmail(email.toLowerCase());
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            // Verificar se usuário está ativo
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Conta desativada. Entre em contato com o suporte'
                });
            }

            // Verificar senha
            const isValidPassword = await User.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            // Gerar tokens
            const accessToken = generateToken(user.id);
            const refreshTokenValue = generateRefreshToken(user.id);

            logger.info(`Login realizado: ${user.email}`);

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        role: user.role,
                        created_at: user.created_at,
                        updated_at: user.updated_at
                    },
                    tokens: {
                        accessToken,
                        refreshToken: refreshTokenValue
                    }
                }
            });
        } catch (error) {
            logger.error(`Erro no login: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Refresh token
    static refreshToken = asyncHandler(async (req, res) => {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token é obrigatório'
            });
        }

        try {
            // Verificar refresh token
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            
            // Buscar usuário
            const user = await User.findById(decoded.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Token inválido'
                });
            }

            // Gerar novos tokens
            const accessToken = generateToken(user.id);
            const newRefreshToken = refreshToken(user.id);

            res.json({
                success: true,
                message: 'Tokens atualizados com sucesso',
                data: {
                    tokens: {
                        accessToken,
                        refreshToken: newRefreshToken
                    }
                }
            });
        } catch (error) {
            logger.error(`Erro no refresh token: ${error.message}`);
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    });

    // Logout
    static logout = asyncHandler(async (req, res) => {
        // Em uma implementação mais robusta, você poderia invalidar o token
        // adicionando-o a uma blacklist no Redis ou banco de dados
        
        logger.info(`Logout realizado: ${req.user.email}`);
        
        res.json({
            success: true,
            message: 'Logout realizado com sucesso'
        });
    });

    // Obter perfil do usuário atual
    static getProfile = asyncHandler(async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            res.json({
                success: true,
                data: {
                    user: user.toJSON()
                }
            });
        } catch (error) {
            logger.error(`Erro ao obter perfil: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Atualizar perfil do usuário
    static updateProfile = asyncHandler(async (req, res) => {
        const { name, phone } = req.body;
        const allowedUpdates = { name, phone };

        // Remover campos undefined
        Object.keys(allowedUpdates).forEach(key => {
            if (allowedUpdates[key] === undefined) {
                delete allowedUpdates[key];
            }
        });

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo válido para atualização'
            });
        }

        try {
            const updatedUser = await User.update(req.user.id, allowedUpdates);
            
            logger.info(`Perfil atualizado: ${req.user.email}`);
            
            res.json({
                success: true,
                message: 'Perfil atualizado com sucesso',
                data: {
                    user: updatedUser.toJSON()
                }
            });
        } catch (error) {
            logger.error(`Erro ao atualizar perfil: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Alterar senha
    static changePassword = asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Senha atual e nova senha são obrigatórias'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A nova senha deve ter pelo menos 6 caracteres'
            });
        }

        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Verificar senha atual
            const isValidPassword = await user.verifyPassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha atual incorreta'
                });
            }

            // Hash da nova senha
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            
            // Atualizar senha
            await User.update(req.user.id, { password: hashedPassword });
            
            logger.info(`Senha alterada: ${user.email}`);
            
            res.json({
                success: true,
                message: 'Senha alterada com sucesso'
            });
        } catch (error) {
            logger.error(`Erro ao alterar senha: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });

    // Verificar se email está disponível
    static checkEmail = asyncHandler(async (req, res) => {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email é obrigatório'
            });
        }

        try {
            const existingUser = await User.findByEmail(email.toLowerCase());
            
            res.json({
                success: true,
                data: {
                    available: !existingUser
                }
            });
        } catch (error) {
            logger.error(`Erro ao verificar email: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    });
}

export default AuthController;