import { DocumentRelation, IDocumentRelation } from './documentRelation.schema';
import mongoose from 'mongoose';

export class RelationsService {
  /**
   * Automatically creates a relationship between a source and a target.
   * Commonly, target is a child (e.g. PI), and source is a parent (e.g. DI)
   */
  static async linkDocuments(
    sourceDocument: string,
    sourceModule: string,
    targetDocument: string,
    targetModule: string,
    relationType: string = 'CONSUMES'
  ): Promise<void> {
    try {
      // Avoid duplicate links
      const existing = await DocumentRelation.findOne({
        sourceDocument,
        targetDocument,
        relationType
      });

      if (!existing) {
        await DocumentRelation.create({
          sourceDocument,
          sourceModule,
          targetDocument,
          targetModule,
          relationType
        });
      }
    } catch (err) {
      console.error('Failed to link documents:', err);
    }
  }

  /**
   * Retrieves the full relation tree for a specific document.
   * This fetches both documents that it consumes (parents) and documents that consume it (children).
   */
  static async getRelatedDocuments(documentId: string): Promise<{ parents: IDocumentRelation[], children: IDocumentRelation[] }> {
    const parents = await DocumentRelation.find({ targetDocument: new mongoose.Types.ObjectId(documentId) }).lean();
    const children = await DocumentRelation.find({ sourceDocument: new mongoose.Types.ObjectId(documentId) }).lean();
    
    return {
      parents: parents as IDocumentRelation[],
      children: children as IDocumentRelation[]
    };
  }

  /**
   * Cleans up relations when a document is deleted.
   */
  static async deleteRelationsForDocument(documentId: string): Promise<void> {
    await DocumentRelation.deleteMany({
      $or: [
        { sourceDocument: new mongoose.Types.ObjectId(documentId) },
        { targetDocument: new mongoose.Types.ObjectId(documentId) }
      ]
    });
  }
}
