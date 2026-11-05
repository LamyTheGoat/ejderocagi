'use strict';
const path = require('node:path');
function createEconomyStore(env = process.env) {
  const cloud = !!env.K_SERVICE || env.NODE_ENV === 'production';
  const backend = env.ECONOMY_BACKEND || (cloud ? 'firestore' : 'sqlite');
  if (cloud && backend !== 'firestore') throw new Error('Cloud production requires Firestore; SQLite/GCS mounts are not supported');
  if (cloud && env.FIRESTORE_EMULATOR_HOST) throw new Error('Firestore emulator is forbidden in production');
  if (backend === 'firestore') return require('./firestore_store').openFirestoreStore({
    projectId: env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT,
    databaseId: env.FIRESTORE_DATABASE_ID || 'economy',
  });
  if (backend !== 'sqlite') throw new Error('Unknown ECONOMY_BACKEND');
  // Deliberately independent of DATA_DIR: that path may be a GCS world volume.
  const filename = path.join(env.LOCAL_ECONOMY_DIR || path.join(__dirname, '../.local-economy'), 'economy.sqlite');
  return require('./economy_store').openEconomyStore(filename);
}
module.exports = { createEconomyStore };
