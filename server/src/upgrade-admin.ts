import 'dotenv/config'
import mongoose from 'mongoose';
import { UserModel } from './identity/infrastructure/persistence/UserModel';
import { requiredEnv } from './config/env'

async function upgradeAdmin() {
  await mongoose.connect(requiredEnv('MONGO_URI'));
  const username = requiredEnv('ADMIN_BOOTSTRAP_USERNAME').trim().toLowerCase()
  console.log('Upgrading existing admin to Super Admin...');
  const result = await UserModel.updateOne(
    { username, role: 'admin' },
    { $set: { isSuperAdmin: true } }
  );
  console.log('Update result:', result);
  process.exit(0);
}

upgradeAdmin().catch(console.error);
