import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from './user.model';
import Role from '../roles/role.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, roleId, assignedPackage, assignedCircle } = req.body;

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
    role: role._id,
    assignedPackage,
    assignedCircle
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

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, email, password, roleId, assignedPackage, assignedCircle } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }
    user.email = email;
  }

  if (roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new ApiError(400, 'Invalid role ID provided');
    }
    user.role = role._id;
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  
  // Allow setting package/circle to empty string/null/undefined
  user.assignedPackage = assignedPackage;
  user.assignedCircle = assignedCircle;

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
  }

  await user.save();

  const updatedUser = await User.findById(id).populate('role').select('-password');
  res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'User updated successfully'));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const authReq = req as any;
  if (authReq.user && authReq.user._id.toString() === id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});

