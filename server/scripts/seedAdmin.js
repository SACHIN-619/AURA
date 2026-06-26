import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aura_db';

async function seedAdmin() {
  console.log('Connecting to database...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const email = 'sachinkr52990@gmail.com';
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log('Admin user not found. Creating new...');
      user = new User({
        email,
        name: 'Sachin Admin',
        role: 'admin'
      });
    } else {
      console.log('Admin user exists. Updating role to admin...');
      user.role = 'admin';
    }

    await user.setPassword('sachinak47');
    await user.save();
    
    console.log(`Successfully seeded admin: ${email} with role: admin`);
  } catch (err) {
    console.error('Error seeding admin user:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

seedAdmin();
