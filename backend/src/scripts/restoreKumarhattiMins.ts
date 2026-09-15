import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';
import { Contractor } from '../modules/contractors/contractor.schema';
import Item from '../modules/items/item.model';
import { parse } from 'csv-parse/sync';
import User from '../modules/users/user.model';

const parseCsvDate = (dateStr: string) => {
  if (!dateStr || dateStr.trim() === '') return undefined;
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (day > 31 && year < 2000) { const temp = year; year = day; day = temp; }
    if (month > 12 && day <= 12) { const temp = month; month = day; day = temp; }
    if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
};

async function restore() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const csvBuffer = fs.readFileSync('/Users/Apple/Desktop/KUMARHATTI ISSUE (1).csv');
  const records = parse(csvBuffer, { columns: true, skip_empty_lines: true });
  
  const allContractors = await Contractor.find({}).lean();
  const contractorCache = new Map<string, any>();
  for (const c of allContractors) {
    if (c.name) contractorCache.set(c.name.replace(/\s+/g, '').toLowerCase(), c);
    if (c.dynamicData?.displayName) contractorCache.set(c.dynamicData.displayName.replace(/\s+/g, '').toLowerCase(), c);
    if (c.dynamicData?.companyName) contractorCache.set(c.dynamicData.companyName.replace(/\s+/g, '').toLowerCase(), c);
  }

  const allItems = await Item.find({}).lean();
  const itemCache = new Map<string, any>();
  for (const i of allItems) {
    const tempCode = (i.itemCode || i.dynamicData?.tempCode || '').toString().trim().toLowerCase();
    const name = (i.dynamicData?.name || '').toString().trim().toLowerCase();
    const circle = (i.dynamicData?.circle || '').toString().trim().toLowerCase();
    if (tempCode && circle) itemCache.set(`tc_${tempCode}_${circle}`, i);
    if (name && circle) itemCache.set(`in_${name}_${circle}`, i);
  }

  const assignmentsByMin: Record<string, any> = {};
  
  for (const row of (records as any[])) {
    const minNo = row['MinNo'] || row['MIN No'] || row['minNo'] || row['AssignmentNumber'] || '';
    if (!minNo) continue;
    
    const contractorName = row['ContractorName'] || row['Contractor'] || '';
    if (!contractorName) continue;
    
    const cleanContractorName = contractorName.trim();
    const contractorKey = cleanContractorName.replace(/\s+/g, '').toLowerCase();
    const contractor = contractorCache.get(contractorKey);
    if (!contractor) continue;
    
    const itemName = row['ItemName'] || row['Description of Material'] || '';
    const tempCode = row['TempCode'] || row['Temp Code'] || '';
    const circle = row['Circle'] || row['circle'] || '';
    
    if (!itemName && !tempCode) continue;
    if (!circle) continue;
    
    let item = null;
    const cleanCircle = circle.trim();
    if (tempCode) {
      item = itemCache.get(`tc_${tempCode.trim().toLowerCase()}_${cleanCircle.toLowerCase()}`);
    }
    if (!item && itemName) {
      item = itemCache.get(`in_${itemName.trim().toLowerCase()}_${cleanCircle.toLowerCase()}`);
    }
    if (!item) continue;
    
    const quantity = Number(row['Quantity'] || row['IssuedQty'] || row['Issued Qty'] || 0);
    if (quantity < 0) continue;
    const rate = Number(row['Rate'] || 0);
    const amount = Number(row['Amount'] || (quantity * rate));
    
    const lineItem = {
      itemId: item._id,
      itemName: itemName || item.description || 'Unknown Item',
      tempCode: tempCode || item.itemCode || '',
      unit: row['Unit'] || item.unit || 'Nos',
      hsnCode: row['HsnCode'] || item.hsnCode || '',
      demandQty: Number(row['DemandQty'] || row['Demand Qty'] || 0),
      quantity,
      rate,
      amount,
      activity: row['Activity'] || row['activity'] || item.dynamicData?.activity || item.dynamicData?.Activity || '',
      loaSrNo: row['LoaSrNo'] || row['LoaSerialNo'] || row['SerialNo'] || row['LoaSerialNumber'] || item.dynamicData?.loaSrNo || item.dynamicData?.loaSerialNo || item.dynamicData?.sku || ''
    };
    
    if (!assignmentsByMin[minNo]) {
      assignmentsByMin[minNo] = {
        contractorId: contractor._id,
        location: circle || 'Store',
        circle: circle || '',
        subcircle: 'Kumarhatti',
        package: 'Package 1(S/N)',
        assignmentNumber: minNo,
        date: parseCsvDate(row['Date']) || new Date(),
        demandNo: row['DemandNo'] || '',
        demandBookNo: row['DemandBookNo'] || '',
        demandDate: parseCsvDate(row['DemandDate']),
        contractorFarmName: row['ContractorFarmName'] || '',
        supervisorEngineer: row['SupervisorEngineer'] || '',
        division: row['Division'] || '',
        subDivision: row['SubDivision'] || '',
        subStation: row['SubStation'] || '',
        feeder: row['Feeder'] || '',
        vehicleNo: row['VehicleNo'] || '',
        minNo: minNo,
        minBookNo: row['MinBookNo'] || '',
        minDate: parseCsvDate(row['MinDate']),
        issuedTfsSrNo: row['IssuedTfsSrNo'] || '',
        remarks: row['Remarks'] || '',
        subTotal: 0,
        total: 0,
        status: 'Sent',
        lineItems: []
      };
    }
    
    assignmentsByMin[minNo].lineItems.push(lineItem);
    assignmentsByMin[minNo].subTotal += amount;
    assignmentsByMin[minNo].total += amount;
  }
  
  const validPayloads = Object.values(assignmentsByMin);
  console.log(`Generated ${validPayloads.length} payloads`);
  if (validPayloads.length > 0) {
    await ContractorAssignment.insertMany(validPayloads);
    console.log(`Successfully saved ${validPayloads.length} Contractor Assignments`);
  }
  
  process.exit(0);
}

restore();
