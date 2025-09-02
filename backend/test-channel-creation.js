import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3006}/api`;

// Dados de teste para login
const testUser = {
  email: 'admin@example.com',
  password: 'Admin123'
};

// Dados de teste para canal
const testChannel = {
  name: 'Canal de Teste',
  api: 'baileys'
};

async function testChannelCreation() {
  try {
    console.log('🔍 Testando criação de canal...');
    console.log(`📡 URL da API: ${API_BASE_URL}`);
    
    // 1. Fazer login para obter token
    console.log('\n1. Fazendo login...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      throw new Error(`Erro no login: ${loginResponse.status} - ${errorData}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;
    
    if (!token) {
      throw new Error('Token não encontrado na resposta do login');
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log(`🔑 Token obtido: ${token.substring(0, 20)}...`);
    
    // 2. Testar criação de canal
    console.log('\n2. Criando canal...');
    console.log(`📋 Dados do canal:`, testChannel);
    
    const channelResponse = await fetch(`${API_BASE_URL}/channels/create-and-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testChannel)
    });
    
    console.log(`📊 Status da resposta: ${channelResponse.status}`);
    
    const responseText = await channelResponse.text();
    console.log(`📄 Resposta bruta: ${responseText}`);
    
    if (!channelResponse.ok) {
      throw new Error(`Erro na criação do canal: ${channelResponse.status} - ${responseText}`);
    }
    
    const channelData = JSON.parse(responseText);
    console.log('✅ Canal criado com sucesso!');
    console.log('📋 Dados do canal criado:', JSON.stringify(channelData, null, 2));
    
    return channelData;
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    throw error;
  }
}

// Executar teste
testChannelCreation()
  .then((result) => {
    console.log('\n🎉 Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n💥 Teste falhou!');
    process.exit(1);
  });