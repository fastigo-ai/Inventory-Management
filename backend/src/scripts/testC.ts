import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import jwt from 'jsonwebtoken';
import { generateAccessToken } from '../core/utils/jwt';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne({});
  const token = generateAccessToken(user as any);
  console.log(token);
  process.exit(0);
}
run();
