# Guia de Implementação do Backend - AtendeZap

Este guia destina-se ao desenvolvedor responsável por construir a lógica do servidor para o sistema AtendeZap. O frontend e o banco de dados Supabase já estão configurados e prontos para a integração.

## 1. Visão Geral

O backend atuará como um intermediário entre o frontend, o banco de dados Supabase e as APIs do WhatsApp (Baileys, Evolution, WhatsApp-Web.js).

**Suas principais responsabilidades são:**
- Gerenciar o ciclo de vida das conexões com o WhatsApp (iniciar sessão, gerar QR Code, manter a conexão).
- Enviar mensagens solicitadas pelo frontend (chat, campanhas em massa).
- Receber eventos (webhooks) das APIs do WhatsApp (novas mensagens, status, etc.) e atualizar o banco de dados de acordo.

## 2. Configuração do Ambiente

### 2.1. Instalação
Navegue até a pasta `backend` e instale as dependências básicas:
```bash
cd backend
yarn install
```

### 2.2. Variáveis de Ambiente
Crie um arquivo `.env` na raiz da pasta `backend` e adicione as mesmas credenciais do Supabase usadas no frontend. O servidor precisa de acesso direto ao banco.

```env
# backend/.env
SUPABASE_URL="URL_DO_SEU_PROJETO_SUPABASE"
SUPABASE_ANON_KEY="SUA_CHAVE_ANON_DO_SUPABASE"
```

### 2.3. Cliente Supabase no Backend
Instale o cliente Supabase para o backend e crie um arquivo de inicialização.

```bash
yarn add @supabase/supabase-js
```

Crie `backend/lib/supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials must be provided in backend/.env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 3. Fluxo de Conexão (Endpoint `/api/channels/connect`)

Este é o fluxo mais crítico a ser implementado.

1.  O frontend envia uma requisição `POST` para `/api/channels/connect` com `{ channelId, apiType }`.
2.  O backend identifica qual API usar (`apiType`).
3.  Inicia uma nova sessão com a biblioteca da API correspondente.
4.  A biblioteca da API irá gerar um QR Code.
5.  **Ação Crítica:** Assim que o QR Code for recebido, atualize a tabela `channels` no Supabase:
    ```javascript
    await supabase
      .from('channels')
      .update({ status: 'connecting', qr_code: 'STRING_DO_QR_CODE_AQUI' })
      .eq('id', channelId);
    ```
6.  O frontend irá detectar essa mudança e exibir o QR Code para o usuário.
7.  Quando a API confirmar a conexão (evento `connection.update`, `ready`, etc.), atualize o status novamente:
    ```javascript
    await supabase
      .from('channels')
      .update({ status: 'connected', qr_code: null }) // Limpa o QR Code
      .eq('id', channelId);
    ```

## 4. Guias de Integração das APIs

Você precisará gerenciar múltiplas instâncias de clientes, uma para cada canal ativo. Armazene essas instâncias em um objeto ou Map, usando o `channel.id` como chave.

### 4.1. Baileys (`@whiskeysockets/baileys`)

**Instalação:** `yarn add @whiskeysockets/baileys`

**Exemplo de Implementação:**
```javascript
// Em seu gerenciador de sessões do Baileys
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { supabase } from './lib/supabaseClient.js'; // Importe seu cliente

async function startBaileysSession(channelId) {
  const { state, saveCreds } = await useMultiFileAuthState(`auth_info_baileys/${channelId}`);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Nós vamos capturar o QR
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[Baileys] QR Code recebido para ${channelId}`);
      // ATUALIZA O SUPABASE COM O QR CODE
      await supabase
        .from('channels')
        .update({ status: 'connecting', qr_code: qr })
        .eq('id', channelId);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startBaileysSession(channelId);
      } else {
        // ATUALIZA O SUPABASE PARA 'disconnected'
        await supabase.from('channels').update({ status: 'disconnected' }).eq('id', channelId);
      }
    } else if (connection === 'open') {
      console.log(`[Baileys] Conexão aberta para ${channelId}`);
      // ATUALIZA O SUPABASE PARA 'connected'
      await supabase.from('channels').update({ status: 'connected', qr_code: null }).eq('id', channelId);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ... adicione aqui os listeners de mensagens ('messages.upsert')
}
```

### 4.2. Evolution API

A Evolution API é um serviço que você deve rodar separadamente. O backend irá interagir com a API REST da Evolution.

**Instalação:** `yarn add axios`

**Exemplo de Implementação:**
```javascript
// Em seu gerenciador de sessões da Evolution
import axios from 'axios';
import { supabase } from './lib/supabaseClient.js';

const EVOLUTION_API_URL = 'http://localhost:8080'; // URL da sua instância Evolution
const EVOLUTION_API_KEY = 'SUA_API_KEY_DA_EVOLUTION';

async function startEvolutionSession(channelId, channelName) {
  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/instance/create`,
      {
        instanceName: channelName,
        token: `token_${channelId}`, // Crie um token único
        qrcode: true,
      },
      { headers: { 'apikey': EVOLUTION_API_KEY } }
    );

    const qrCode = response.data.qrcode.base64;
    
    // ATUALIZA O SUPABASE COM O QR CODE
    await supabase
      .from('channels')
      .update({ status: 'connecting', qr_code: qrCode, instance_id: channelName })
      .eq('id', channelId);

    // Você precisará de um endpoint no seu backend para receber webhooks da Evolution
    // e atualizar o status para 'connected' quando o evento de conexão chegar.

  } catch (error) {
    console.error('[Evolution] Erro ao criar instância:', error);
    await supabase.from('channels').update({ status: 'error' }).eq('id', channelId);
  }
}
```

### 4.3. WhatsApp Web.js

**Instalação:** `yarn add whatsapp-web.js`

**Exemplo de Implementação:**
```javascript
// Em seu gerenciador de sessões do whatsapp-web.js
import { Client, LocalAuth } from 'whatsapp-web.js';
import { supabase } from './lib/supabaseClient.js';

function startWebJsSession(channelId) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: channelId }),
    puppeteer: { args: ['--no-sandbox'] } // Importante para ambientes Linux
  });

  client.on('qr', async (qr) => {
    console.log(`[Web.js] QR Code recebido para ${channelId}`);
    // ATUALIZA O SUPABASE COM O QR CODE
    await supabase
      .from('channels')
      .update({ status: 'connecting', qr_code: qr })
      .eq('id', channelId);
  });

  client.on('ready', async () => {
    console.log(`[Web.js] Cliente pronto para ${channelId}`);
    // ATUALIZA O SUPABASE PARA 'connected'
    await supabase
      .from('channels')
      .update({ status: 'connected', qr_code: null })
      .eq('id', channelId);
  });
  
  client.on('disconnected', async () => {
    // ATUALIZA O SUPABASE PARA 'disconnected'
    await supabase.from('channels').update({ status: 'disconnected' }).eq('id', channelId);
  });

  client.initialize();

  // ... adicione aqui o listener de mensagens ('message')
}
```

## 5. Executando o Projeto Completo

Use o script na raiz do projeto para iniciar o frontend e o backend simultaneamente.

```bash
# Na pasta raiz do monorepo
npm run dev:all # (Ou um script similar que você pode criar com 'concurrently')
```

Com este guia, você tem a base para construir toda a lógica do servidor. Boa sorte!
