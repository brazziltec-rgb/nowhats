-- Criar tabela de sessões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL,
    session_name TEXT NOT NULL,
    phone_number TEXT,
    api_type TEXT NOT NULL CHECK (api_type IN ('baileys', 'evolution', 'web.js')),
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
    qr_code TEXT,
    session_data TEXT, -- JSON data for session storage
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_seen_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_name ON whatsapp_sessions(user_id, session_name);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sessions_api_type ON whatsapp_sessions(api_type);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON whatsapp_sessions(is_active);