import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { verbose } = sqlite3;
const sqlite3Verbose = verbose();

// Criar diretório de dados se não existir
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'atendezap.sqlite');

// Criar conexão SQLite
const db = new sqlite3Verbose.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com SQLite:', err.message);
    } else {
        console.log('✅ Conectado ao banco SQLite:', dbPath);
    }
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

// Função para executar queries com Promise
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve({ rows });
            }
        });
    });
};

// Função para executar comandos (INSERT, UPDATE, DELETE)
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ 
                    lastID: this.lastID, 
                    changes: this.changes 
                });
            }
        });
    });
};

// Função para fechar conexão
const closeDb = () => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('🔌 Conexão SQLite fechada');
                resolve();
            }
        });
    });
};

export {
    query,
    run,
    closeDb,
    db
};

export default {
    query,
    run,
    closeDb,
    db
};