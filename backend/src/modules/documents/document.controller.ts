import { Request, Response } from 'express';
import { AppDocument } from './document.schema';
import cloudinary from '../../core/utils/cloudinary';

// Create a small utility to wrap cloudinary upload stream in a promise
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceType, sourceId } = req.body;
    
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const file = req.file;
    const uploadedBy = (req as any).user?.id;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, 'erp_documents');

    // Create Document record
    const document = new AppDocument({
      fileName: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: result.secure_url,
      publicId: result.public_id,
      sourceType,
      sourceId,
      uploadedBy,
      status: 'Pending',
    });

    await document.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message,
    });
  }
};

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceType, sourceId, status } = req.query;

    const filter: any = {};
    if (sourceType) filter.sourceType = sourceType;
    if (sourceId) filter.sourceId = sourceId;
    if (status) filter.status = status;

    const documents = await AppDocument.find(filter)
      .populate('uploadedBy', 'firstName lastName name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message,
    });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const document = await AppDocument.findById(id);

    if (!document) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Delete from Cloudinary
    if (document.publicId) {
      await cloudinary.uploader.destroy(document.publicId);
    }

    await AppDocument.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message,
    });
  }
};
