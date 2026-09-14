import { AuditSettings, IAuditSettings } from '../../modules/audit/auditSettings.model';

// In-memory cache for ultra-fast checks during Mongoose hooks
let settingsCache: Map<string, IAuditSettings> = new Map();

export const loadAuditSettingsCache = async () => {
  try {
    const settings = await AuditSettings.find({}).lean();
    const newCache = new Map<string, any>();
    for (const setting of settings) {
      newCache.set(setting.entityName, setting);
    }
    settingsCache = newCache;
    console.log(`Loaded audit settings into cache for ${settings.length} entities.`);
  } catch (error) {
    console.error('Failed to load audit settings cache:', error);
  }
};

export const getAuditSettingsForEntity = (entityName: string): any | null => {
  return settingsCache.get(entityName) || null;
};

// Call this when settings are updated via the UI
export const refreshAuditSettingsCache = async () => {
  await loadAuditSettingsCache();
};
