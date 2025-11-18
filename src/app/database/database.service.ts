// src/app/database/database.service.ts
import { Injectable } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

import { createTables } from './database.schema';

export interface DbGasto {
  id?: number;
  categoria: string;
  descricao: string;
  valor: number;
  criadoEm: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite!: SQLiteConnection;
  private db!: SQLiteDBConnection;
  private readonly DB_NAME = 'familia_financeira';
  private initialized = false;

  constructor() {
    // instancia helper (não executa I/O)
    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
    } catch (e) {
      // se falhar aqui, deixamos para init tratar
      (this as any).sqlite = undefined;
    }
  }

  /** Inicialização segura, compatível com várias versões do plugin */
  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1) Verifica disponibilidade do plugin (múltiplas assinaturas possíveis)
      let pluginAvailable = true;
      try {
        if (typeof (CapacitorSQLite as any).isAvailable === 'function') {
          const avail = await (CapacitorSQLite as any).isAvailable();
          pluginAvailable = !!(avail && (avail.result ?? avail === true));
        } else if (typeof (CapacitorSQLite as any).isPluginAvailable === 'function') {
          const avail = await (CapacitorSQLite as any).isPluginAvailable();
          pluginAvailable = !!(avail && (avail.result ?? avail === true));
        } else {
          // não conseguimos detectar API — tentamos inicializar mesmo assim
          pluginAvailable = true;
        }
      } catch (e) {
        console.warn('[DB] isAvailable/isPluginAvailable checagem falhou:', e);
        pluginAvailable = false;
      }

      // Se plugin não disponível (ex.: browser), faz fallback e não tenta abrir DB nativo
      if (!pluginAvailable) {
        console.warn('[DB] plugin sqlite não disponível (web). Rodando em fallback (sem DB).');
        this.initialized = true;
        return;
      }

      // 2) Inicializar plugin se existir initializePlugin (algumas versões exigem)
      if (!this.sqlite) {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
      }
      if (typeof (this.sqlite as any).initializePlugin === 'function') {
        try {
          await (this.sqlite as any).initializePlugin();
        } catch (e) {
          // não fatal — seguimos
          console.warn('[DB] initializePlugin falhou (não fatal):', e);
        }
      }

      // 3) Permissões (se API disponível)
      try {
        if (typeof (CapacitorSQLite as any).checkPermissions === 'function') {
          const perm = await (CapacitorSQLite as any).checkPermissions();
          // algumas versões retornam { result: 'granted' } ou boolean
          const ok = perm && (perm.result === 'granted' || perm === true);
          if (!ok && typeof (CapacitorSQLite as any).requestPermissions === 'function') {
            await (CapacitorSQLite as any).requestPermissions();
          }
        } else if (typeof (CapacitorSQLite as any).requestPermissions === 'function') {
          await (CapacitorSQLite as any).requestPermissions();
        }
      } catch (permErr) {
        console.warn('[DB] permissões SQLite falharam (seguir em frente):', permErr);
      }

      // 4) Criar/recuperar conexão (compatível com variações)
      let conn: any = null;
      try {
        // Checa se já existe conexão (algumas versões têm isConnection)
        if (typeof (this.sqlite as any).isConnection === 'function') {
          const exists = await (this.sqlite as any).isConnection(this.DB_NAME, false);
          if (exists && (exists.result ?? exists === true)) {
            // retrieveConnection
            if (typeof (this.sqlite as any).retrieveConnection === 'function') {
              conn = await (this.sqlite as any).retrieveConnection(this.DB_NAME, false);
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // se não recuperamos, tentamos criar
      if (!conn) {
        // createConnection pode ter assinatura (name, encrypted, mode, version, ???)
        if (typeof (this.sqlite as any).createConnection === 'function') {
          try {
            // tentamos a forma mais comum
            conn = await (this.sqlite as any).createConnection(this.DB_NAME, false, 'no-encryption', 1);
          } catch (e) {
            // fallback: tentar sem alguns parâmetros
            try {
              conn = await (this.sqlite as any).createConnection(this.DB_NAME, false, 'no-encryption');
            } catch (e2) {
              // última tentativa: apenas com nome
              conn = await (this.sqlite as any).createConnection(this.DB_NAME);
            }
          }
        } else {
          throw new Error('createConnection não disponível na API sqlite instalada.');
        }
      }

      // 5) atribui e abre
      this.db = conn as SQLiteDBConnection;

      if (this.db && typeof (this.db as any).open === 'function') {
        await (this.db as any).open();
      } else if (typeof (this.sqlite as any).openConnection === 'function') {
        // algumas versões expõem abertura via sqlite.openConnection(...)
        await (this.sqlite as any).openConnection(this.DB_NAME);
        // tentar recuperar conexão novamente
        if (typeof (this.sqlite as any).retrieveConnection === 'function') {
          this.db = await (this.sqlite as any).retrieveConnection(this.DB_NAME, false);
        }
      } else {
        console.warn('[DB] Nenhum método open() encontrado — seguir em frente (modo fallback).');
      }

      // 6) criar tabelas (execute admite string ou objeto em diferentes versões)
      try {
        if (this.db && typeof (this.db as any).execute === 'function') {
          try {
            await (this.db as any).execute(createTables);
          } catch (eExec) {
            // fallback para formato { statements: ... }
            try {
              await (this.db as any).execute({ statements: createTables });
            } catch (e2) {
              console.warn('[DB] execute falhou nos dois formatos:', eExec, e2);
            }
          }
        } else if (this.db && typeof (this.db as any).run === 'function') {
          // se não há execute, podemos executar como run (cada linha)
          // dividir por ';' e executar cada statement simples
          const stmts = String(createTables).split(';').map(s => s.trim()).filter(Boolean);
          for (const s of stmts) {
            try {
              await (this.db as any).run(s);
            } catch (erun) {
              console.warn('[DB] run falhou ao criar tabela stmt:', s, erun);
            }
          }
        } else {
          console.warn('[DB] Nenhum método execute/run disponível para criar tabelas.');
        }
      } catch (e) {
        console.warn('[DB] Erro ao tentar criar tabelas (non-fatal):', e);
      }

      this.initialized = true;
      console.log('[DB] Inicializado com sucesso (modo nativo).');
    } catch (err) {
      console.error('[DB] Erro na inicialização final:', err);
      // proteger a UI: não propagar erro inesperado
      this.initialized = true; // marca initialized para evitar loops; em fallback consider empty DB
    }
  }

  /** Adicionar gasto (com checagem de disponibilidade) */
  public async addGasto(g: DbGasto): Promise<void> {
    if (!this.initialized || !this.db) {
      // fallback: nada a fazer (poderíamos armazenar em memória se quiser)
      console.warn('[DB] addGasto chamado mas DB não inicializado — ignorando.');
      return;
    }
    const sql = 'INSERT INTO gastos (categoria, descricao, valor, criadoEm) VALUES (?, ?, ?, ?);';
    const values = [
      g.categoria ?? '',
      g.descricao ?? '',
      Number(g.valor ?? 0),
      g.criadoEm ?? new Date().toISOString()
    ];
    try {
      if (typeof (this.db as any).run === 'function') {
        await (this.db as any).run(sql, values);
      } else if (typeof (this.db as any).execute === 'function') {
        // fallback, inserir com template (escape simples)
        const esc = (v: any) => String(v).replace(/'/g, "''");
        const inline = `INSERT INTO gastos (categoria, descricao, valor, criadoEm) VALUES ('${esc(values[0])}','${esc(values[1])}',${Number(values[2])},'${esc(values[3])}')`;
        await (this.db as any).execute(inline);
      } else {
        console.warn('[DB] Nenhum método para executar INSERT disponível.');
      }
    } catch (e) {
      console.error('[DB] Erro addGasto:', e);
    }
  }

  /** Listar gastos */
  public async listarGastos(): Promise<DbGasto[]> {
    if (!this.initialized || !this.db) return [];
    try {
      if (typeof (this.db as any).query === 'function') {
        const res = await (this.db as any).query('SELECT * FROM gastos ORDER BY id DESC;');
        return (res?.values ?? []) as DbGasto[];
      } else if (typeof (this.db as any).execute === 'function') {
        // execute pode não retornar valores; tentamos query fallback
        const res = await (this.db as any).execute('SELECT * FROM gastos ORDER BY id DESC;');
        return (res?.values ?? []) as DbGasto[];
      } else {
        return [];
      }
    } catch (e) {
      console.error('[DB] listarGastos erro:', e);
      return [];
    }
  }

  /** Remover gasto por criadoEm */
  public async removerGastoPorCriadoEm(criadoEm: string): Promise<void> {
    if (!this.initialized || !this.db) return;
    const sql = 'DELETE FROM gastos WHERE criadoEm = ?;';
    try {
      if (typeof (this.db as any).run === 'function') {
        await (this.db as any).run(sql, [criadoEm]);
      } else if (typeof (this.db as any).execute === 'function') {
        await (this.db as any).execute(`DELETE FROM gastos WHERE criadoEm = '${String(criadoEm).replace(/'/g,"''")}'`);
      } else {
        console.warn('[DB] Nenhum método para executar DELETE disponível.');
      }
    } catch (e) {
      console.error('[DB] removerGastoPorCriadoEm erro:', e);
    }
  }

  /** Fechar conexão com vários fallbacks */
  public async close(): Promise<void> {
    try {
      if (!this.sqlite) return;
      // try sqlite.closeConnection(name, false)
      if (typeof (this.sqlite as any).isConnection === 'function') {
        const exists = await (this.sqlite as any).isConnection(this.DB_NAME, false);
        if (exists && (exists.result ?? exists === true)) {
          if (typeof (this.sqlite as any).closeConnection === 'function') {
            await (this.sqlite as any).closeConnection(this.DB_NAME, false);
            return;
          }
          if (typeof (CapacitorSQLite as any).closeConnection === 'function') {
            await (CapacitorSQLite as any).closeConnection({ database: this.DB_NAME });
            return;
          }
          if (this.db && typeof (this.db as any).close === 'function') {
            await (this.db as any).close();
            return;
          }
        }
      } else {
        // fallback generic
        if (typeof (CapacitorSQLite as any).closeConnection === 'function') {
          await (CapacitorSQLite as any).closeConnection({ database: this.DB_NAME });
          return;
        }
        if (this.db && typeof (this.db as any).close === 'function') {
          await (this.db as any).close();
          return;
        }
      }
    } catch (e) {
      console.warn('[DB] close erro:', e);
    } finally {
      this.initialized = false;
    }
  }
}
