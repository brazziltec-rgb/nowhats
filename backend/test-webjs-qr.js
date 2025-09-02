import fetch from 'node-fetch';
import QRCode from 'qrcode-terminal';

// Configurações da Web.js API
const WEBJS_API_URL = 'http://localhost:3002';
const WEBJS_API_KEY = process.env.WEBJS_API_KEY || 'your-webjs-api-key';
const INSTANCE_NAME = `test-webjs-${Date.now()}`;

console.log('🚀 Iniciando teste da Web.js API...');
console.log('🔗 URL da API:', WEBJS_API_URL);
console.log('📱 Nome da instância:', INSTANCE_NAME);

// Headers para autenticação
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': WEBJS_API_KEY
};

async function testWebJsAPI() {
  try {
    console.log('\n1️⃣ Verificando se a Web.js API está rodando...');
    
    // Verificar se a API está rodando
    const healthResponse = await fetch(`${WEBJS_API_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`API não está respondendo: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Web.js API está rodando:', healthData.status);
    console.log('📊 Instâncias ativas:', healthData.instances);
    
    console.log('\n2️⃣ Criando nova instância...');
    
    // Criar instância
    const createResponse = await fetch(`${WEBJS_API_URL}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName: INSTANCE_NAME
      })
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Erro ao criar instância: ${errorData.error}`);
    }
    
    const createData = await createResponse.json();
    console.log('✅ Instância criada:', createData.instanceName);
    console.log('📊 Status inicial:', createData.status);
    
    console.log('\n3️⃣ Aguardando inicialização e geração do QR code...');
    console.log('⏳ Isso pode levar alguns segundos para o Puppeteer inicializar...');
    
    // Aguardar e obter QR code
    let qrCodeObtained = false;
    let attempts = 0;
    const maxAttempts = 20; // Aumentar tentativas pois Web.js demora mais
    
    while (!qrCodeObtained && attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Tentativa ${attempts}/${maxAttempts} - Verificando QR code...`);
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3 segundos
      
      try {
        // Verificar status primeiro
        const statusResponse = await fetch(`${WEBJS_API_URL}/instance/${INSTANCE_NAME}/status`, {
          headers
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`📊 Status atual: ${statusData.instance.status}`);
          
          if (statusData.instance.status === 'qr_code' && statusData.instance.hasQRCode) {
            // Tentar obter QR code
            const qrResponse = await fetch(`${WEBJS_API_URL}/instance/${INSTANCE_NAME}/qrcode`, {
              headers
            });
            
            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              
              if (qrData.qrcode && qrData.qrcode.base64) {
                console.log('\n📱 QR Code gerado! Escaneie com seu WhatsApp:');
                console.log('=' .repeat(50));
                
                // Extrair dados do QR code do base64
                const base64Data = qrData.qrcode.base64;
                
                // Para Web.js, vamos tentar extrair o código QR do base64
                // Como não temos acesso direto ao código QR, vamos mostrar uma mensagem
                console.log('🖼️ QR Code Base64 recebido com sucesso!');
                console.log('📱 Abra o WhatsApp no seu celular e escaneie o QR code');
                console.log('🔗 Para visualizar o QR code, acesse:');
                console.log(`   ${WEBJS_API_URL}/instance/${INSTANCE_NAME}/qrcode`);
                
                // Tentar decodificar se possível (isso é uma simulação)
                console.log('\n📋 QR Code disponível via API');
                console.log('💡 Dica: Use um cliente HTTP para acessar a URL acima e ver o QR code');
                
                console.log('=' .repeat(50));
                console.log('⏰ QR Code expira em 20 segundos. Escaneie rapidamente!');
                console.log('📱 Abra o WhatsApp > Dispositivos conectados > Conectar um dispositivo');
                
                qrCodeObtained = true;
                
                // Monitorar status da conexão
                console.log('\n4️⃣ Monitorando status da conexão...');
                monitorConnectionStatus();
                
              } else {
                console.log('⏳ QR code ainda não está disponível...');
              }
            } else {
              console.log('⏳ QR code ainda não foi gerado...');
            }
          } else if (statusData.instance.status === 'connected') {
            console.log('\n🎉 Instância já está conectada!');
            qrCodeObtained = true;
          } else if (statusData.instance.status === 'auth_failure') {
            console.log('❌ Falha na autenticação');
            break;
          } else {
            console.log(`⏳ Status: ${statusData.instance.status} - Aguardando...`);
          }
        } else {
          console.log('⚠️ Erro ao verificar status da instância');
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar QR code:', error.message);
      }
    }
    
    if (!qrCodeObtained) {
      console.log('❌ Não foi possível obter o QR code após várias tentativas');
      console.log('💡 Verifique se o Puppeteer está funcionando corretamente');
      return;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste da Web.js API:', error.message);
    process.exit(1);
  }
}

// Função para monitorar o status da conexão
async function monitorConnectionStatus() {
  const checkStatus = async () => {
    try {
      const statusResponse = await fetch(`${WEBJS_API_URL}/instance/${INSTANCE_NAME}/status`, {
        headers
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.instance.status;
        const connected = statusData.instance.connected;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`📊 [${timestamp}] Status: ${status} | Conectado: ${connected ? 'Sim' : 'Não'}`);
        
        if (status === 'connected' && connected) {
          console.log('\n🎉 Conexão estabelecida com sucesso!');
          console.log('✅ Teste da Web.js API concluído!');
          console.log('\n⚠️ Pressione Ctrl+C para encerrar o teste');
          return;
        }
        
        if (status === 'auth_failure' || status === 'disconnected') {
          console.log('❌ Erro na conexão da instância');
          return;
        }
        
        // Continuar monitorando
        setTimeout(checkStatus, 5000);
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar status:', error.message);
      setTimeout(checkStatus, 5000);
    }
  };
  
  checkStatus();
}

// Função de limpeza
async function cleanup() {
  try {
    console.log('\n🧹 Limpando instância de teste...');
    
    const deleteResponse = await fetch(`${WEBJS_API_URL}/instance/${INSTANCE_NAME}`, {
      method: 'DELETE',
      headers
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Instância removida com sucesso');
    } else {
      console.log('⚠️ Erro ao remover instância');
    }
  } catch (error) {
    console.log('⚠️ Erro na limpeza:', error.message);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando teste...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando teste...');
  await cleanup();
  process.exit(0);
});

// Iniciar teste
testWebJsAPI();

console.log('\n📋 Instruções:');
console.log('1. Certifique-se de que a Web.js API está rodando na porta 3002');
console.log('2. Aguarde a inicialização do Puppeteer (pode demorar)');
console.log('3. Aguarde o QR Code ser gerado');
console.log('4. Acesse a URL fornecida para ver o QR Code');
console.log('5. Abra o WhatsApp no seu celular');
console.log('6. Vá em "Dispositivos conectados"');
console.log('7. Toque em "Conectar um dispositivo"');
console.log('8. Escaneie o QR Code');
console.log('9. Aguarde a confirmação de conexão');
console.log('\n⏳ Aguardando...');