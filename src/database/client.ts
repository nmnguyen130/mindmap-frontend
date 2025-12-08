import * as SQLite from "expo-sqlite";
import { CREATE_INDEXES, CREATE_TABLES, CREATE_TRIGGERS } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;
let dbReadyPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  // Return existing instance
  if (db) return db;

  // Return in-progress initialization (prevents race condition)
  if (dbReadyPromise) return dbReadyPromise;

  // Start initialization
  dbReadyPromise = (async () => {
    const database = await SQLite.openDatabaseAsync("mindmaps.db");
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

    await database.execAsync(CREATE_TABLES);
    await database.execAsync(CREATE_INDEXES);
    await database.execAsync(CREATE_TRIGGERS);

    db = database;
    return database;
  })();

  return dbReadyPromise;
}
