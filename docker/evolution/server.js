const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 8080;

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/app/logs/evolution.log' })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Armazenamento em memória para instâncias
const instances = new Map();

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const apiKey = req.headers['apikey'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env.EVOLUTION_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Rotas
app.get('/', (req, res) => {
  res.json({ 
    message: 'Evolution API Mock Server',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Criar instância
app.post('/instance/create', authenticate, (req, res) => {
  try {
    const { instanceName } = req.body;
    
    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName is required' });
    }
    
    if (instances.has(instanceName)) {
      return res.status(409).json({ error: 'Instance already exists' });
    }
    
    const instance = {
      instanceName,
      status: 'created',
      qrcode: null,
      createdAt: new Date().toISOString()
    };
    
    instances.set(instanceName, instance);
    
    logger.info(`Instance created: ${instanceName}`);
    
    res.status(201).json({
      instance: {
        instanceName,
        status: 'created'
      }
    });
  } catch (error) {
    logger.error('Error creating instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Conectar instância
app.post('/instance/connect/:instanceName', authenticate, (req, res) => {
  try {
    const { instanceName } = req.params;
    
    if (!instances.has(instanceName)) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const instance = instances.get(instanceName);
    instance.status = 'connecting';
    
    // Simular geração de QR code
    setTimeout(async () => {
      try {
        const qrData = `whatsapp-qr-${instanceName}-${Date.now()}`;
        const qrcode = await QRCode.toDataURL(qrData);
        
        instance.qrcode = {
          base64: qrcode,
          code: qrData
        };
        instance.status = 'qrcode';
        
        logger.info(`QR code generated for instance: ${instanceName}`);
      } catch (error) {
        logger.error('Error generating QR code:', error);
        instance.status = 'error';
      }
    }, 2000);
    
    res.json({
      instance: {
        instanceName,
        status: 'connecting'
      }
    });
  } catch (error) {
    logger.error('Error connecting instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obter QR code
app.get('/instance/qrcode/:instanceName', authenticate, (req, res) => {
  try {
    const { instanceName } = req.params;
    
    if (!instances.has(instanceName)) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const instance = instances.get(instanceName);
    
    if (!instance.qrcode) {
      return res.status(404).json({ error: 'QR code not available' });
    }
    
    res.json({
      qrcode: instance.qrcode
    });
  } catch (error) {
    logger.error('Error getting QR code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Status da instância
app.get('/instance/status/:instanceName', authenticate, (req, res) => {
  try {
    const { instanceName } = req.params;
    
    if (!instances.has(instanceName)) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const instance = instances.get(instanceName);
    
    res.json({
      instance: {
        instanceName,
        status: instance.status
      }
    });
  } catch (error) {
    logger.error('Error getting instance status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Listar instâncias
app.get('/instance/fetchInstances', authenticate, (req, res) => {
  try {
    const instanceList = Array.from(instances.values()).map(instance => ({
      instanceName: instance.instanceName,
      status: instance.status
    }));
    
    res.json(instanceList);
  } catch (error) {
    logger.error('Error fetching instances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deletar instância
app.delete('/instance/delete/:instanceName', authenticate, (req, res) => {
  try {
    const { instanceName } = req.params;
    
    if (!instances.has(instanceName)) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    instances.delete(instanceName);
    
    logger.info(`Instance deleted: ${instanceName}`);
    
    res.json({ message: 'Instance deleted successfully' });
  } catch (error) {
    logger.error('Error deleting instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enviar mensagem
app.post('/message/sendText/:instanceName', authenticate, (req, res) => {
  try {
    const { instanceName } = req.params;
    const { number, text } = req.body;
    
    if (!instances.has(instanceName)) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    const instance = instances.get(instanceName);
    
    if (instance.status !== 'connected') {
      return res.status(400).json({ error: 'Instance not connected' });
    }
    
    // Simular envio de mensagem
    const messageId = uuidv4();
    
    logger.info(`Message sent from ${instanceName} to ${number}: ${text}`);
    
    res.json({
      key: {
        id: messageId,
        remoteJid: `${number}@s.whatsapp.net`
      },
      message: {
        conversation: text
      },
      status: 'sent'
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`Evolution API Mock Server running on port ${PORT}`);
  console.log(`Evolution API Mock Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});