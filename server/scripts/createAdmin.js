import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const email = 'admin@aura.com';
  let admin = await User.findOne({ email });

  if (admin) {
    admin.role = 'admin';
    await admin.save();
    console.log('Existing user promoted to admin:', email);
  } else {
    admin = new User({
      email,
      name: 'Admin Maestro',
      role: 'admin',
      phone: '+919999999999'
    });
    await admin.setPassword('password123');
    await admin.save();
    console.log('Admin account created:');
    console.log('Email:', email);
    console.log('Password: password123');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
