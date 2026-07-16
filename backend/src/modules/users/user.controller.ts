import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from './user.model';
import Role from '../roles/role.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, roleId } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(400, 'Invalid role ID provided');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: role._id
  });

  const userResponse = user.toJSON();
  res.status(201).json(new ApiResponse(201, { user: userResponse }, 'User created'));
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({}).populate('role').select('-password');
  res.status(200).json(new ApiResponse(200, { users }, 'Users fetched successfully'));
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roleId } = req.body;

  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(400, 'Invalid role ID provided');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role: role._id },
    { new: true }
  ).populate('role').select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(new ApiResponse(200, { user }, 'User role updated'));
});
