import { ModelFacade } from '@watchnt/models';
import { PGLiteRelationalStorage, IndexedDBSettingsStore } from '@watchnt/storage';

class DbStore {
  facade = $state<ModelFacade | null>(null);
  loading = $state(true);
  error = $state<Error | null>(null);

  settings = $state<IndexedDBSettingsStore | null>(null);

  async init() {
    if (this.facade) return;
    
    try {
      this.loading = true;
      // Use OPFS data directory for persistence across reloads
      const storage = new PGLiteRelationalStorage('idb://watchnt');
      const facade = new ModelFacade(storage);
      
      const settingsStore = new IndexedDBSettingsStore();
      await settingsStore.init();
      this.settings = settingsStore;
      
      // Run migrations
      await facade.migrate();
      
      this.facade = facade;
    } catch (err) {
      console.error('Failed to initialize database:', err);
      this.error = err instanceof Error ? err : new Error(String(err));
    } finally {
      this.loading = false;
    }
  }
}

export const dbStore = new DbStore();
