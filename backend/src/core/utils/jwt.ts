import jwt from 'jsonwebtoken';
import { IUser } from '../../modules/users/user.model';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_access_jwt_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key';

export const generateAccessToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id, email: user.email, sessionVersion: user.sessionVersion },
    JWT_ACCESS_SECRET,
    { expiresIn: '1d' } // Extended to 1 day
  );
};

export const generateRefreshToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id, sessionVersion: user.sessionVersion },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
