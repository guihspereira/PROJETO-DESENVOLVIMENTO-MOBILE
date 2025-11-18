// src/app/database/database.schema.ts

// Script SQL em formato string — ESSENCIAL para o plugin funcionar
export const createTables = `
CREATE TABLE IF NOT EXISTS gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  criadoEm TEXT NOT NULL
);
`;
