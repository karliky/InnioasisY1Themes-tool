/**
 * IndexedDB service for storing cloned/custom themes.
 * Replaces localStorage to avoid size limitations.
 */

const DB_NAME = 'Y1ThemesDB';
const DB_VERSION = 1;
const STORE_NAME = 'clonedThemes';

export interface ClonedThemeData {
  id: string;
  spec: any;
  loadedAssets: any[];
  assetOverrides: Record<string, string>;
  originalThemeId?: string;
  clonedDate?: string;
}

export class IndexedDBError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'IndexedDBError';
  }
}

class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize the database connection
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.dbPromise = null;
        reject(new IndexedDBError(
          'Failed to open IndexedDB. Your browser may not support IndexedDB, or it may be disabled.',
          request.error
        ));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Get all cloned themes from IndexedDB
   */
  async getAllThemes(): Promise<Record<string, ClonedThemeData>> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const themes: Record<string, ClonedThemeData> = {};
          request.result.forEach((theme: ClonedThemeData) => {
            themes[theme.id] = theme;
          });
          resolve(themes);
        };

        request.onerror = () => {
          reject(new IndexedDBError(
            'Failed to load themes from database.',
            request.error
          ));
        };
      });
    } catch (error) {
      if (error instanceof IndexedDBError) throw error;
      throw new IndexedDBError('Failed to load themes from database.', error);
    }
  }

  /**
   * Get a single theme by ID
   */
  async getTheme(id: string): Promise<ClonedThemeData | null> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new IndexedDBError(
            `Failed to load theme "${id}" from database.`,
            request.error
          ));
        };
      });
    } catch (error) {
      if (error instanceof IndexedDBError) throw error;
      throw new IndexedDBError(`Failed to load theme "${id}" from database.`, error);
    }
  }

  /**
   * Save or update a theme
   */
  async saveTheme(themeData: ClonedThemeData): Promise<void> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(themeData);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          // Check for quota errors
          if (request.error?.name === 'QuotaExceededError') {
            reject(new IndexedDBError(
              'Storage quota exceeded. The theme data is too large. Try using smaller images.',
              request.error
            ));
          } else {
            reject(new IndexedDBError(
              `Failed to save theme "${themeData.id}" to database.`,
              request.error
            ));
          }
        };

        transaction.onerror = () => {
          reject(new IndexedDBError(
            `Failed to save theme "${themeData.id}" to database.`,
            transaction.error
          ));
        };
      });
    } catch (error) {
      if (error instanceof IndexedDBError) throw error;
      throw new IndexedDBError(`Failed to save theme "${themeData.id}" to database.`, error);
    }
  }

  /**
   * Delete a theme by ID
   */
  async deleteTheme(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new IndexedDBError(
            `Failed to delete theme "${id}" from database.`,
            request.error
          ));
        };
      });
    } catch (error) {
      if (error instanceof IndexedDBError) throw error;
      throw new IndexedDBError(`Failed to delete theme "${id}" from database.`, error);
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
