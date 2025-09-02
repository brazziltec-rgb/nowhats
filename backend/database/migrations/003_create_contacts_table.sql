-- Criar tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    session_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    name TEXT,
    profile_picture_url TEXT,
    is_business BOOLEAN DEFAULT 0,
    is_group BOOLEAN DEFAULT 0,
    group_participants TEXT, -- JSON array for group participants
    last_message_at DATETIME,
    is_blocked BOOLEAN DEFAULT 0,
    tags TEXT, -- JSON array for contact tags
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE
);

-- Criar índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_session_phone ON contacts(session_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_is_business ON contacts(is_business);
CREATE INDEX IF NOT EXISTS idx_contacts_is_group ON contacts(is_group);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_last_message_at ON contacts(last_message_at);