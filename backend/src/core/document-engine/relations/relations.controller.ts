import { Request, Response } from 'express';
import { RelationsService } from './relations.service';

export const getDocumentRelations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    
    const relations = await RelationsService.getRelatedDocuments(documentId);
    
    res.status(200).json({
      success: true,
      data: relations
    });
  } catch (error: any) {
    console.error('Error fetching document relations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document relations',
      error: error.message
    });
  }
};
