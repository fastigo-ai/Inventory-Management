import { Request, Response } from 'express';
import { Location } from './location.schema';

export const createLocation = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const newLocation = new Location(data);
    await newLocation.save();

    res.status(201).json({
      success: true,
      data: newLocation,
      message: 'Location created successfully',
    });
  } catch (error: any) {
    console.error('Error creating Location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Location',
      error: error.message,
    });
  }
};

export const getLocations = async (req: Request, res: Response) => {
  try {
    const locations = await Location.find().populate('parentLocation').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Locations',
      error: error.message,
    });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedLocation = await Location.findByIdAndUpdate(id, data, { new: true });
    
    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    res.status(200).json({
      success: true,
      data: updatedLocation,
      message: 'Location updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update Location',
      error: error.message,
    });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if there are any child locations that depend on this location
    const childLocations = await Location.countDocuments({ parentLocation: id });
    if (childLocations > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location because it has child locations assigned to it.',
      });
    }

    const deletedLocation = await Location.findByIdAndDelete(id);
    if (!deletedLocation) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Location deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete Location',
      error: error.message,
    });
  }
};
