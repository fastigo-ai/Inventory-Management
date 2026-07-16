import jwt from 'jsonwebtoken';
import { IUser } from '../../modules/users/user.model';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

export const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
