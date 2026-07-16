import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../users/user.model';
import { generateToken } from '../../core/utils/jwt';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('role');
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password as string);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = generateToken(user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  const userResponse = user.toJSON();
  
  res.status(200).json(
    new ApiResponse(200, { token, user: userResponse }, 'Login successful')
  );
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, 'User fetched successfully')
  );
});
