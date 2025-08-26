const cacheMap = new Map();

export const getCache = (key) => cacheMap.get(key);

export const setCache = (key, value) => {
  if (cacheMap.get(key)) {
    return cacheMap.get(key);
  }
  return cacheMap.set(key, value);
};

export const clearCache = () => cacheMap.clear();
