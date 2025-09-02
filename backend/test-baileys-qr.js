import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import QRCode from 'qrcode-terminal';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações
const SESSION_PATH = path.join(__dirname, 'sessions', 'test-baileys');

console.log('🚀 Iniciando teste da API Baileys...');
console.log('📁 Sessão será salva em:', SESSION_PATH);

async function testBaileysAPI() {
  try {
    // Criar diretório de sessão se não existir
    await fs.mkdir(SESSION_PATH, { recursive: true });
    console.log('✅ Diretório de sessão criado/verificado');

    // Obter versão mais recente do Baileys
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📱 Usando Baileys versão ${version}, isLatest: ${isLatest}`);

    // Carregar estado de autenticação
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    console.log('🔐 Estado de autenticação carregado');

    // Criar socket
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // Vamos usar nossa própria implementação
      browser: ['NoWhats-Test', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true
    });

    console.log('🔌 Socket criado, aguardando eventos...');

    // Event listeners
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n📱 QR Code gerado! Escaneie com seu WhatsApp:');
        console.log('=' .repeat(50));
        
        // Gerar QR code no terminal
        QRCode.generate(qr, { small: true });
        
        console.log('=' .repeat(50));
        console.log('⏰ QR Code expira em 20 segundos. Escaneie rapidamente!');
        console.log('📱 Abra o WhatsApp > Dispositivos conectados > Conectar um dispositivo');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        const reason = (lastDisconnect?.error)?.output?.statusCode || 'Desconhecido';
        
        console.log(`\n❌ Conexão fechada. Motivo: ${reason}`);
        
        if (reason === DisconnectReason.loggedOut) {
          console.log('🚪 Usuário deslogado. Limpando sessão...');
          // Limpar sessão se deslogado
          try {
            await fs.rm(SESSION_PATH, { recursive: true, force: true });
            console.log('🗑️ Sessão limpa');
          } catch (error) {
            console.log('⚠️ Erro ao limpar sessão:', error.message);
          }
        }
        
        if (shouldReconnect) {
          console.log('🔄 Tentando reconectar em 3 segundos...');
          setTimeout(() => {
            console.log('🔄 Reconectando...');
            testBaileysAPI();
          }, 3000);
        } else {
          console.log('❌ Não será feita nova tentativa de conexão');
          process.exit(1);
        }
      } else if (connection === 'open') {
        console.log('\n✅ Conectado com sucesso!');
        console.log('📞 Número:', sock.user?.id?.split(':')[0] || 'Não disponível');
        console.log('👤 Nome:', sock.user?.name || 'Não disponível');
        console.log('\n🎉 Teste da API Baileys concluído com sucesso!');
        console.log('\n⚠️ Pressione Ctrl+C para encerrar o teste');
        
        // Manter conexão ativa para testes
        setInterval(() => {
          if (sock.user) {
            console.log(`💚 Conexão ativa - ${new Date().toLocaleTimeString()}`);
          }
        }, 30000);
      }
    });

    // Salvar credenciais
    sock.ev.on('creds.update', saveCreds);

    // Lidar com mensagens recebidas (opcional para teste)
    sock.ev.on('messages.upsert', async (messageUpdate) => {
      const { messages, type } = messageUpdate;
      
      if (type === 'notify') {
        for (const message of messages) {
          if (!message.key.fromMe && message.message) {
            const from = message.key.remoteJid;
            const text = message.message.conversation || 
                        message.message.extendedTextMessage?.text || 
                        'Mensagem de mídia';
            
            console.log(`\n📨 Nova mensagem de ${from}:`);
            console.log(`💬 ${text}`);
          }
        }
      }
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Encerrando teste...');
      if (sock) {
        await sock.logout();
        console.log('👋 Desconectado');
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro no teste da API Baileys:', error);
    process.exit(1);
  }
}

// Iniciar teste
testBaileysAPI();

console.log('\n📋 Instruções:');
console.log('1. Aguarde o QR Code aparecer');
console.log('2. Abra o WhatsApp no seu celular');
console.log('3. Vá em "Dispositivos conectados"');
console.log('4. Toque em "Conectar um dispositivo"');
console.log('5. Escaneie o QR Code que aparecerá abaixo');
console.log('6. Aguarde a confirmação de conexão');
console.log('\n⏳ Aguardando...');