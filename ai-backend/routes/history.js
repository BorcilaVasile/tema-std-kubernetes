const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');
const ProcessingRequest = require('../models/processing-request');

// Endpoint pentru obținerea istoricului de procesări
router.get('/', async (req, res) => {
  try {
    const history = await databaseService.getProcessingHistory();
    
    // Transformă rezultatele în formatul așteptat de client
    const formattedHistory = history.map(item => new ProcessingRequest(item).toApiResponse());
    
    res.json(formattedHistory);
  } catch (error) {
    console.error('Eroare la obținerea istoricului:', error);
    res.status(500).json({ error: 'Eroare la obținerea istoricului', details: error.message });
  }
});

module.exports = router;