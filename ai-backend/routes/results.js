const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');
const ProcessingResult = require('../models/processing-result');

router.get('/', (req, res) => {
  res.json({ message: 'Serviciul de rezultate este funcțional' });
});

router.get('/:requestId', async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const result = await databaseService.getProcessingResult(requestId);

    if (!result) {
      return res.status(404).json({ error: 'Rezultat negăsit' });
    }

    const processingResult = new ProcessingResult(result);
    res.json(processingResult.toApiResponse());
  } catch (error) {
    console.error('Eroare la obținerea rezultatului:', error);
    res.status(500).json({ error: 'Eroare la obținerea rezultatului', details: error.message });
  }
});

module.exports = router;