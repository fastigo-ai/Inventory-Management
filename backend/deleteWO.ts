import { connectDB, mongoose } from './src/config/db';
import { ContractorWorkOrder } from './src/modules/contractors/contractorWorkOrder.schema';

const deleteWO = async () => {
  try {
    await connectDB();
    
    const wo = await ContractorWorkOrder.findOne({ workOrderNumber: 'WO26080001' });
    if (wo) {
      console.log('Found Work Order:', wo.workOrderNumber);
      await ContractorWorkOrder.deleteOne({ workOrderNumber: 'WO26080001' });
      console.log('Work Order deleted successfully.');
    } else {
      console.log('Work Order WO26080001 not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

deleteWO();
