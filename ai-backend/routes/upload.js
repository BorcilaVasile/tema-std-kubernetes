const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

const blobService = require('../services/blobStorage');
const formRecognizerService = require('../services/formRecognizer');
const databaseService = require('../services/database');
const ProcessingRequest = require('../models/processing-request');

(async () => {
  try {
    await blobService.initialize();
    await databaseService.initialize();
  } catch (error) {
    console.error('Eroare la inițializarea serviciilor:', error);
  }
})();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Niciun fișier încărcat' });
    }

    const blobUrl = await blobService.uploadFile(req.file.buffer, req.file.originalname);

    const requestData = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      blobUrl,
      status: 'processing'
    };

    const requestId = await databaseService.createProcessingRequest(requestData);

    res.status(202).json({
      message: 'Fișier încărcat cu succes și trimis pentru procesare',
      requestId
    });

    processDocumentAsync(requestId, blobUrl);

  } catch (error) {
    console.error('Eroare la procesarea fișierului:', error);
    res.status(500).json({ error: 'Eroare la procesarea fișierului', details: error.message });
  }
});

async function processDocumentAsync(requestId, blobUrl) {
  try {
    console.log(`Procesare document: ${requestId}, URL: ${blobUrl}`);

    if (!blobUrl.includes('sv=') && !blobUrl.includes('sig=')) {
      console.log('URL-ul nu conține un token SAS, se generează unul nou');

      const url = new URL(blobUrl);
      const pathSegments = url.pathname.split('/');
      const blobName = pathSegments[pathSegments.length - 1];

      blobUrl = await blobService.generateSasUrlForBlob(blobName);
      console.log(`URL nou generat: ${blobUrl}`);
    }

    const isAccessible = await blobService.testBlobAccess(blobUrl);
    if (!isAccessible) {
      throw {
        code: 'AccessError',
        message: 'Document inaccesibil',
        details: 'URL-ul documentului nu este accesibil. Verificați permisiunile containerului.'
      };
    }

    const result = await formRecognizerService.analyzeDocument(blobUrl);

    await databaseService.saveProcessingResult(requestId, result);

    console.log(`Documentul cu ID ${requestId} a fost procesat cu succes`);
  } catch (error) {
    console.error(`Eroare la procesarea documentului ${requestId}:`, error);

    const errorDetails = {
      code: error.code || 'UnknownError',
      message: error.message || 'Eroare necunoscută',
      details: error.details || error.technicalDetails || '',
      suggestions: error.suggestions || [
        'Încercați să încărcați documentul din nou',
        'Verificați formatul documentului',
        'Contactați administratorul sistemului dacă problema persistă'
      ],
      timestamp: new Date().toISOString()
    };

    await databaseService.updateProcessingStatus(requestId, 'failed', JSON.stringify(errorDetails));
  }
}

router.get('/status/:requestId', async (req, res) => {
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