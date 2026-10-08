const storageKey = (userId: string) => `nexus_one_event_rsvps_v1:${userId}`;

export const getRegisteredEventIds = (userId: string, fallback: string[]) => {
  try {
    const saved = localStorage.getItem(storageKey(userId));
    const parsed: unknown = saved ? JSON.parse(saved) : fallback;
    return Array.isArray(parsed) && parsed.every(id => typeof id === 'string') ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const saveRegisteredEventIds = (userId: string, ids: string[]) => {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(ids)); } catch { /* Keep the RSVP usable for this session if storage is blocked. */ }
};
