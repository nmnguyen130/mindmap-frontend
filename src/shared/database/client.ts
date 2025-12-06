import * as SQLite from "expo-sqlite";
import { CREATE_INDEXES, CREATE_TABLES, CREATE_TRIGGERS } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("mindmaps.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.execAsync(CREATE_TABLES);
  await db.execAsync(CREATE_INDEXES);
  await db.execAsync(CREATE_TRIGGERS);

  return db;
}
