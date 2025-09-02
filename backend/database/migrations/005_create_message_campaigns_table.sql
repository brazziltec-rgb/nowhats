-- Criar tabela de campanhas de mensagens
CREATE TABLE IF NOT EXISTS message_campaigns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
    content TEXT,
    media_url TEXT,
    media_filename TEXT,
    target_contacts TEXT NOT NULL, -- JSON array of contact IDs or phone numbers
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled')),
    scheduled_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    delay_between_messages INTEGER DEFAULT 1000, -- milliseconds
    settings TEXT, -- JSON for campaign settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON message_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_session_id ON message_campaigns(session_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON message_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON message_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON message_campaigns(created_at);