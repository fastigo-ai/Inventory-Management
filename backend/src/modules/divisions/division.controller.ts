import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import Division from './division.schema';

export const getDivisions = asyncHandler(async (req: Request, res: Response) => {
  const { package: pkg, circle, subcircle } = req.query;
  const filter: any = {};
  if (pkg) filter.package = pkg;
  if (circle) filter.circle = circle;
  if (subcircle) filter.subcircle = subcircle;

  const divisions = await Division.find(filter).sort({ name: 1 });
  res.json(new ApiResponse(200, divisions, 'Divisions fetched successfully'));
});

export const createDivision = asyncHandler(async (req: Request, res: Response) => {
  const { name, package: pkg, circle, subcircle } = req.body;
  if (!name) return res.status(400).json(new ApiResponse(400, null, 'Name is required'));

  const existing = await Division.findOne({ name, package: pkg || '', circle: circle || '', subcircle: subcircle || '' });
  if (existing) {
    return res.json(new ApiResponse(200, existing, 'Division already exists'));
  }

  const division = await Division.create({ name, package: pkg || '', circle: circle || '', subcircle: subcircle || '' });
  res.json(new ApiResponse(201, division, 'Division created successfully'));
});
