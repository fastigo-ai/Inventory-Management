import { Request, Response } from 'express';
import axios from 'axios';


export const getGstDetails = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.params;

    if (!gstin || gstin.length !== 15) {
      return res.status(400).json({ success: false, message: 'Invalid GSTIN format' });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GST API is not configured on the server.' });
    }

    const response = await axios.get(`https://gst-insights-api.p.rapidapi.com/getGSTDetailsUsingGST/${gstin}`, {
      headers: {
        'x-rapidapi-host': 'gst-insights-api.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });

    if (response.data && response.data.success) {
      return res.status(200).json(response.data);
    } else {
      console.log('GST API Failure Response:', response.data);
      return res.status(400).json({ success: false, message: response.data?.message || 'Failed to fetch GST details from upstream.' });
    }
  } catch (error: any) {
    console.error('GST fetch error:', error?.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: error?.response?.data?.message || 'Error communicating with GST verification service' 
    });
  }
};
