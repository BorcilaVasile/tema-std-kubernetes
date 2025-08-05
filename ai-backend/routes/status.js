const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');
const ProcessingRequest = require('../models/processing-request');

// Route for checking processing status
router.get('/:requestId', async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const request = await databaseService.getProcessingRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Cerere de procesare negăsită' });
    }
    
    const processingRequest = new ProcessingRequest(request);
    res.json(processingRequest.toApiResponse());
  } catch (error) {
    console.error('Eroare la verificarea statusului:', error);
    res.status(500).json({ error: 'Eroare la verificarea statusului', details: error.message });
  }
});

module.exports = router;