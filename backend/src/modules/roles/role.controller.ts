import { Request, Response } from 'express';
import Role from './role.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;

  const existingRole = await Role.findOne({ name });
  if (existingRole) {
    throw new ApiError(400, 'Role with this name already exists');
  }

  const role = await Role.create({ name, description, permissions });
  res.status(201).json(new ApiResponse(201, { role }, 'Role created'));
});

export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  const roles = await Role.find({});
  res.status(200).json(new ApiResponse(200, { roles }, 'Roles fetched successfully'));
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  const role = await Role.findByIdAndUpdate(
    id,
    { name, description, permissions },
    { new: true, runValidators: true }
  );

  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  res.status(200).json(new ApiResponse(200, { role }, 'Role updated'));
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = await Role.findByIdAndDelete(id);

  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  res.status(200).json(new ApiResponse(200, {}, 'Role deleted'));
});
