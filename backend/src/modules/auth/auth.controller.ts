import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../users/user.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../core/utils/jwt';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';

const setCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  };

  res.cookie('accessToken', accessToken, {
    ...options,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

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

  // Only initialize sessionVersion if it doesn't exist. Do not increment on every login, 
  // otherwise it logs out all other devices/tabs.
  if (user.sessionVersion === undefined) {
    user.sessionVersion = 0;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  if (user.isModified('sessionVersion')) {
    await user.save({ validateBeforeSave: false });
  }

  setCookies(res, accessToken, refreshToken);

  const userResponse = user.toJSON();

  res.status(200).json(
    new ApiResponse(200, { user: userResponse, accessToken, refreshToken }, 'Login successful')
  );
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Stateless logout: just clear cookies

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  };

  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);

  res.status(200).json(new ApiResponse(200, {}, 'Logout successful'));
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken: any = verifyRefreshToken(incomingRefreshToken);

    const user = await User.findById(decodedToken.id);
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    if (user.sessionVersion !== decodedToken.sessionVersion) {
      throw new ApiError(401, 'Session expired by a newer login');
    }

    const accessToken = generateAccessToken(user);
    
    // Do not rotate the refresh token to avoid concurrency issues (e.g. multiple tabs or strict mode)
    // We just return a new access token and the same refresh token
    setCookies(res, accessToken, incomingRefreshToken);

    res.status(200).json(
      new ApiResponse(200, { accessToken, refreshToken: incomingRefreshToken }, 'Access token refreshed successfully')
    );
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, 'User fetched successfully')
  );
});
