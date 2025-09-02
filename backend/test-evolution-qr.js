import fetch from 'node-fetch';
import QRCode from 'qrcode-terminal';

// Configurações da Evolution API
const EVOLUTION_API_URL = 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'your-evolution-api-key';
const INSTANCE_NAME = `test-evolution-${Date.now()}`;

console.log('🚀 Iniciando teste da Evolution API...');
console.log('🔗 URL da API:', EVOLUTION_API_URL);
console.log('📱 Nome da instância:', INSTANCE_NAME);

// Headers para autenticação
const headers = {
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_API_KEY
};

async function testEvolutionAPI() {
  try {
    console.log('\n1️⃣ Verificando se a Evolution API está rodando...');
    
    // Verificar se a API está rodando
    const healthResponse = await fetch(`${EVOLUTION_API_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`API não está respondendo: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Evolution API está rodando:', healthData.status);
    
    console.log('\n2️⃣ Criando nova instância...');
    
    // Criar instância
    const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
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
    console.log('✅ Instância criada:', createData.instance.instanceName);
    
    console.log('\n3️⃣ Conectando instância...');
    
    // Conectar instância
    const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, {
      method: 'POST',
      headers
    });
    
    if (!connectResponse.ok) {
      const errorData = await connectResponse.json();
      throw new Error(`Erro ao conectar instância: ${errorData.error}`);
    }
    
    const connectData = await connectResponse.json();
    console.log('✅ Instância conectando:', connectData.instance.status);
    
    console.log('\n4️⃣ Aguardando geração do QR code...');
    
    // Aguardar e obter QR code
    let qrCodeObtained = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!qrCodeObtained && attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Tentativa ${attempts}/${maxAttempts} - Verificando QR code...`);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
      
      try {
        const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/qrcode/${INSTANCE_NAME}`, {
          headers
        });
        
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          
          if (qrData.qrcode && qrData.qrcode.code) {
            console.log('\n📱 QR Code gerado! Escaneie com seu WhatsApp:');
            console.log('=' .repeat(50));
            
            // Gerar QR code no terminal
            QRCode.generate(qrData.qrcode.code, { small: true });
            
            console.log('=' .repeat(50));
            console.log('⏰ QR Code expira em 20 segundos. Escaneie rapidamente!');
            console.log('📱 Abra o WhatsApp > Dispositivos conectados > Conectar um dispositivo');
            console.log('\n🔗 Dados do QR Code:', qrData.qrcode.code);
            console.log('🖼️ Base64 disponível:', qrData.qrcode.base64 ? 'Sim' : 'Não');
            
            qrCodeObtained = true;
            
            // Monitorar status da conexão
            console.log('\n5️⃣ Monitorando status da conexão...');
            monitorConnectionStatus();
            
          } else {
            console.log('⏳ QR code ainda não está disponível...');
          }
        } else {
          console.log('⏳ QR code ainda não foi gerado...');
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar QR code:', error.message);
      }
    }
    
    if (!qrCodeObtained) {
      console.log('❌ Não foi possível obter o QR code após várias tentativas');
      return;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste da Evolution API:', error.message);
    process.exit(1);
  }
}

// Função para monitorar o status da conexão
async function monitorConnectionStatus() {
  const checkStatus = async () => {
    try {
      const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/status/${INSTANCE_NAME}`, {
        headers
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.instance.status;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`📊 [${timestamp}] Status da instância: ${status}`);
        
        if (status === 'open' || status === 'connected') {
          console.log('\n🎉 Conexão estabelecida com sucesso!');
          console.log('✅ Teste da Evolution API concluído!');
          console.log('\n⚠️ Pressione Ctrl+C para encerrar o teste');
          return;
        }
        
        if (status === 'error') {
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
    
    const deleteResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${INSTANCE_NAME}`, {
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
testEvolutionAPI();

console.log('\n📋 Instruções:');
console.log('1. Certifique-se de que a Evolution API está rodando na porta 8080');
console.log('2. Aguarde o QR Code aparecer');
console.log('3. Abra o WhatsApp no seu celular');
console.log('4. Vá em "Dispositivos conectados"');
console.log('5. Toque em "Conectar um dispositivo"');
console.log('6. Escaneie o QR Code que aparecerá abaixo');
console.log('7. Aguarde a confirmação de conexão');
console.log('\n⏳ Aguardando...');