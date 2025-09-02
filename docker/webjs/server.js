const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Armazenar instâncias ativas
const instances = new Map();

// Middleware de autenticação simples
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  
  if (!apiKey || apiKey !== process.env.WEBJS_API_KEY) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  next();
};

// Aplicar autenticação em todas as rotas (exceto health check)
app.use('/instance', authenticate);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'webjs-api',
    timestamp: new Date().toISOString(),
    instances: instances.size
  });
});

// Criar nova instância
app.post('/instance/create', async (req, res) => {
  try {
    const { instanceName } = req.body;
    
    if (!instanceName) {
      return res.status(400).json({ error: 'Nome da instância é obrigatório' });
    }
    
    if (instances.has(instanceName)) {
      return res.status(409).json({ error: 'Instância já existe' });
    }
    
    // Criar cliente Web.js
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: instanceName,
        dataPath: path.join(__dirname, 'sessions', instanceName)
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });
    
    const instanceData = {
      client,
      status: 'initializing',
      qrCode: null,
      connected: false,
      createdAt: new Date().toISOString()
    };
    
    // Event listeners
    client.on('qr', async (qr) => {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr);
        instanceData.qrCode = qrCodeDataURL;
        instanceData.status = 'qr_code';
        console.log(`QR Code gerado para instância: ${instanceName}`);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    });
    
    client.on('ready', () => {
      instanceData.status = 'connected';
      instanceData.connected = true;
      instanceData.qrCode = null;
      console.log(`Instância conectada: ${instanceName}`);
    });
    
    client.on('authenticated', () => {
      instanceData.status = 'authenticated';
      console.log(`Instância autenticada: ${instanceName}`);
    });
    
    client.on('auth_failure', () => {
      instanceData.status = 'auth_failure';
      instanceData.connected = false;
      console.log(`Falha na autenticação: ${instanceName}`);
    });
    
    client.on('disconnected', (reason) => {
      instanceData.status = 'disconnected';
      instanceData.connected = false;
      console.log(`Instância desconectada: ${instanceName}, Razão: ${reason}`);
    });
    
    // Armazenar instância
    instances.set(instanceName, instanceData);
    
    // Inicializar cliente
    await client.initialize();
    
    res.json({
      success: true,
      instanceName,
      status: instanceData.status,
      message: 'Instância criada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter QR Code da instância
app.get('/instance/:instanceName/qrcode', (req, res) => {
  try {
    const { instanceName } = req.params;
    const instance = instances.get(instanceName);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    
    if (!instance.qrCode) {
      return res.status(404).json({ error: 'QR Code não disponível' });
    }
    
    res.json({
      success: true,
      qrcode: {
        base64: instance.qrCode,
        instanceName
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter status da instância
app.get('/instance/:instanceName/status', (req, res) => {
  try {
    const { instanceName } = req.params;
    const instance = instances.get(instanceName);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    
    res.json({
      success: true,
      instance: {
        name: instanceName,
        status: instance.status,
        connected: instance.connected,
        hasQRCode: !!instance.qrCode,
        createdAt: instance.createdAt
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todas as instâncias
app.get('/instances', (req, res) => {
  try {
    const instanceList = Array.from(instances.entries()).map(([name, data]) => ({
      name,
      status: data.status,
      connected: data.connected,
      hasQRCode: !!data.qrCode,
      createdAt: data.createdAt
    }));
    
    res.json({
      success: true,
      instances: instanceList,
      total: instanceList.length
    });
    
  } catch (error) {
    console.error('Erro ao listar instâncias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar instância
app.delete('/instance/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const instance = instances.get(instanceName);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    
    // Desconectar cliente
    if (instance.client) {
      await instance.client.destroy();
    }
    
    // Remover da memória
    instances.delete(instanceName);
    
    // Limpar sessão (opcional)
    try {
      const sessionPath = path.join(__dirname, 'sessions', instanceName);
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Erro ao limpar sessão:', error);
    }
    
    res.json({
      success: true,
      message: 'Instância deletada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem
app.post('/instance/:instanceName/sendMessage', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { number, message } = req.body;
    
    const instance = instances.get(instanceName);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    
    if (!instance.connected) {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }
    
    if (!number || !message) {
      return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
    }
    
    const chatId = number.includes('@') ? number : `${number}@c.us`;
    const sentMessage = await instance.client.sendMessage(chatId, message);
    
    res.json({
      success: true,
      messageId: sentMessage.id.id,
      timestamp: sentMessage.timestamp
    });
    
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Web.js API rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando servidor...');
  
  // Desconectar todas as instâncias
  for (const [name, instance] of instances) {
    try {
      if (instance.client) {
        await instance.client.destroy();
      }
    } catch (error) {
      console.error(`Erro ao desconectar instância ${name}:`, error);
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando servidor...');
  
  // Desconectar todas as instâncias
  for (const [name, instance] of instances) {
    try {
      if (instance.client) {
        await instance.client.destroy();
      }
    } catch (error) {
      console.error(`Erro ao desconectar instância ${name}:`, error);
    }
  }
  
  process.exit(0);
});