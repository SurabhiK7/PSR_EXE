// One-off: create all project collections + indexes in the configured database.
require('dotenv').config();
const mongoose = require('mongoose');

const modelFiles = [
  './src/modules/projects/project.model',
  './src/modules/updates/update.model',
  './src/modules/milestones/milestone.model',
  './src/modules/risks/risk.model',
  './src/modules/contacts/contact.model',
  './src/modules/documents/document.model',
  './src/modules/history/history.model',
  './src/modules/users/user.model',
  './src/modules/settings/setting.model',
  './src/modules/permissions/permission.model',
  './src/config/activityLog.model',
];

(async () => {
  const uri = process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('[init] Connected to', uri, '(db:', mongoose.connection.name + ')');

  modelFiles.forEach((f) => require(f));

  for (const name of mongoose.modelNames()) {
    const Model = mongoose.model(name);
    await Model.createCollection().catch((e) => {
      if (e.codeName !== 'NamespaceExists') throw e;
    });
    await Model.init(); // build indexes
    console.log(`[init] Ready collection: ${Model.collection.name}`);
  }

  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log('[init] Collections now in db:', cols.map((c) => c.name).sort().join(', '));

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('[init] FAIL', e);
  process.exit(1);
});
