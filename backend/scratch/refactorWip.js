const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/modules/wip/wip.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Setup the background wrapper
const block1Old = `  const clientId = (req.query.clientId as string) || (req.body.clientId as string);
  
  if (clientId) {
    sseService.sendEvent(clientId, { stage: 'started', progress: 0, message: 'WIP Bulk Import Started' });
    await new Promise(r => setTimeout(r, 50));
  }

  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';
  const flagged: any[] = [];
  let totalSaved = 0;

  if (clientId) {
    sseService.sendEvent(clientId, { stage: 'parsing', progress: 5, message: 'Fetching metadata...' });
    await new Promise(r => setTimeout(r, 50));
  }`;

const block1New = `  const clientId = (req.query.clientId as string) || (req.body.clientId as string);
  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';
  const files = req.files as Express.Multer.File[];

  if (clientId) {
    res.status(202).json(new ApiResponse(202, null, 'Upload started in background. Please wait for completion.'));
  }

  const processUpload = async () => {
    try {
      if (clientId) {
        sseService.sendEvent(clientId, { stage: 'started', progress: 0, message: 'WIP Bulk Import Started' });
        await new Promise(r => setTimeout(r, 50));
        sseService.sendEvent(clientId, { stage: 'parsing', progress: 5, message: 'Fetching metadata...' });
        await new Promise(r => setTimeout(r, 50));
      }

      const flagged: any[] = [];
      let totalSaved = 0;`;

content = content.replace(block1Old, block1New);

// 2. Replace req.files with files inside the loop
content = content.replace(/const totalFiles = req\.files\.length;/g, 'const totalFiles = files.length;');
content = content.replace(/const file = req\.files\[fileIdx\];/g, 'const file = files[fileIdx];');

// 3. Replace res.status(403)
const block3Old = `return res.status(403).json(new ApiResponse(403, null, \`Permission Denied: You are assigned to circle '\${(user as any).assignedCircle}', but the sheet '\${sheetName}' contains data for circle '\${meta.Circle}'. Please upload sheets only for your assigned circle (Allowed: \${allowedCircles.join(', ')}).\`));`;
const block3New = `throw new ApiError(403, \`Permission Denied: You are assigned to circle '\${(user as any).assignedCircle}', but the sheet '\${sheetName}' contains data for circle '\${meta.Circle}'. Please upload sheets only for your assigned circle (Allowed: \${allowedCircles.join(', ')}).\`);`;
content = content.replace(block3Old, block3New);

// 4. Replace res.status(400)
const block4Old = `return res.status(400).json(new ApiResponse(400, null, \`Validation Error in sheet '\${sheetName}' (Site: \${siteHeader}): Contractor '\${contractorNameStr || 'Unknown'}' not found in the database. Please add this contractor first before importing.\`));`;
const block4New = `throw new ApiError(400, \`Validation Error in sheet '\${sheetName}' (Site: \${siteHeader}): Contractor '\${contractorNameStr || 'Unknown'}' not found in the database. Please add this contractor first before importing.\`);`;
content = content.replace(block4Old, block4New);

// 5. Replace the end of the function
const block5Old = `    if (clientId) {
      sseService.sendEvent(clientId, {
        stage: 'COMPLETED',
        progress: 100,
        message: 'Upload and processing complete!',
        result: { totalSaved, flagged }
      });
      await new Promise(r => setTimeout(r, 50));
    }

  res.status(200).json(
    new ApiResponse(200, { totalSaved, flagged }, 'Upload and processing complete!')
  );
});`;

const block5New = `      if (clientId) {
        sseService.sendEvent(clientId, {
          stage: 'COMPLETED',
          progress: 100,
          message: 'Upload and processing complete!',
          result: { totalSaved, flagged }
        });
        await new Promise(r => setTimeout(r, 50));
      }

      return { totalSaved, flagged };
    } catch (err: any) {
      console.error('WIP background error:', err);
      if (clientId) {
        sseService.sendEvent(clientId, { stage: 'ERROR', message: err.message || 'Background upload failed' });
      }
      throw err;
    }
  };

  if (clientId) {
    processUpload().catch(e => console.error(e));
  } else {
    const result = await processUpload();
    res.status(200).json(new ApiResponse(200, result, 'Upload and processing complete!'));
  }
});`;

content = content.replace(block5Old, block5New);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated wip.controller.ts');
