import { Request, Response } from 'express';
import { AllocationService } from './allocation.service';

export const getDocumentAllocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceId } = req.params;
    const { excludePiId, moduleType } = req.query;

    // Phase 1: We only support DI allocation for now
    if (moduleType === 'DI' || !moduleType) {
      const allocations = await AllocationService.getDiAllocation(
        typeof sourceId === 'string' ? sourceId : String(sourceId), 
        typeof excludePiId === 'string' ? excludePiId : undefined
      );
      res.status(200).json({
        success: true,
        data: allocations
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: 'Unsupported moduleType for allocation.'
    });
  } catch (error: any) {
    console.error('Error fetching allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocation data',
      error: error.message
    });
  }
};
