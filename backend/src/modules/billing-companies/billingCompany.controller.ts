import { Request, Response } from 'express';
import { BillingCompany } from './billingCompany.schema';
import cloudinary from '../../core/utils/cloudinary';
import streamifier from 'streamifier';

export const createBillingCompany = async (req: Request, res: Response) => {
  try {
    const { name, address, phone, email, gstNo, companyNumber } = req.body;
    
    let logoUrl = '';

    if (req.file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'billing-companies' },
          (error, result) => {
            if (result) {
              resolve(result.secure_url);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file!.buffer).pipe(stream);
      });

      logoUrl = await uploadPromise as string;
    }

    const newBillingCompany = new BillingCompany({
      name,
      address,
      phone,
      email,
      gstNo,
      companyNumber,
      logoUrl
    });

    await newBillingCompany.save();

    res.status(201).json({ success: true, data: newBillingCompany });
  } catch (error: any) {
    console.error('Error creating billing company:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getBillingCompanies = async (req: Request, res: Response) => {
  try {
    const billingCompanies = await BillingCompany.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: billingCompanies });
  } catch (error: any) {
    console.error('Error getting billing companies:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateBillingCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, gstNo, companyNumber } = req.body;

    const billingCompany = await BillingCompany.findById(id);
    if (!billingCompany) {
      return res.status(404).json({ success: false, message: 'Billing company not found' });
    }

    let logoUrl = billingCompany.logoUrl;

    if (req.file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'billing-companies' },
          (error, result) => {
            if (result) {
              resolve(result.secure_url);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file!.buffer).pipe(stream);
      });

      logoUrl = await uploadPromise as string;
    }

    billingCompany.name = name || billingCompany.name;
    billingCompany.address = address || billingCompany.address;
    billingCompany.phone = phone !== undefined ? phone : billingCompany.phone;
    billingCompany.email = email !== undefined ? email : billingCompany.email;
    billingCompany.gstNo = gstNo !== undefined ? gstNo : billingCompany.gstNo;
    billingCompany.companyNumber = companyNumber !== undefined ? companyNumber : billingCompany.companyNumber;
    billingCompany.logoUrl = logoUrl;

    await billingCompany.save();

    res.status(200).json({ success: true, data: billingCompany });
  } catch (error: any) {
    console.error('Error updating billing company:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteBillingCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const billingCompany = await BillingCompany.findByIdAndDelete(id);
    if (!billingCompany) {
      return res.status(404).json({ success: false, message: 'Billing company not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error: any) {
    console.error('Error deleting billing company:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
