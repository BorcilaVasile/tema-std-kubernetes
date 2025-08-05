const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // Limită de 10MB

// Import servicii
const blobService = require('../services/blobStorage');
const formRecognizerService = require('../services/formRecognizer');
const databaseService = require('../services/database');
const ProcessingRequest = require('../models/processing-request');

// Inițializează serviciile
(async () => {
  try {
    await blobService.initialize();
    await databaseService.initialize();
  } catch (error) {
    console.error('Eroare la inițializarea serviciilor:', error);
  }
})();

// Endpoint pentru upload de fișiere
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Niciun fișier încărcat' });
    }

    // 1. Încarcă fișierul în Blob Storage
    const blobUrl = await blobService.uploadFile(req.file.buffer, req.file.originalname);
    
    // 2. Creează cererea de procesare în baza de date
    const requestData = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      blobUrl,
      status: 'processing'
    };
    
    const requestId = await databaseService.createProcessingRequest(requestData);
    
    // 3. Returnează imediat ID-ul cererii pentru client
    res.status(202).json({
      message: 'Fișier încărcat cu succes și trimis pentru procesare',
      requestId
    });
    
    // 4. Procesează documentul asincron
    processDocumentAsync(requestId, blobUrl);
    
  } catch (error) {
    console.error('Eroare la procesarea fișierului:', error);
    res.status(500).json({ error: 'Eroare la procesarea fișierului', details: error.message });
  }
});

// Funcție pentru procesarea asincronă a documentului
async function processDocumentAsync(requestId, blobUrl) {
  try {
    console.log(`Procesare document: ${requestId}, URL: ${blobUrl}`);
    
    // Verifică dacă URL-ul are un token SAS
    if (!blobUrl.includes('sv=') && !blobUrl.includes('sig=')) {
      console.log('URL-ul nu conține un token SAS, se generează unul nou');
      
      // Extrage numele blob-ului din URL
      const url = new URL(blobUrl);
      const pathSegments = url.pathname.split('/');
      const blobName = pathSegments[pathSegments.length - 1];
      
      // Generează un nou URL cu SAS
      blobUrl = await blobService.generateSasUrlForBlob(blobName);
      console.log(`URL nou generat: ${blobUrl}`);
    }
    
    // Verifică accesibilitatea URL-ului înainte de procesare
    const isAccessible = await blobService.testBlobAccess(blobUrl);
    if (!isAccessible) {
      throw {
        code: 'AccessError',
        message: 'Document inaccesibil',
        details: 'URL-ul documentului nu este accesibil. Verificați permisiunile containerului.'
      };
    }
    
    // Procesează documentul cu Form Recognizer
    const result = await formRecognizerService.analyzeDocument(blobUrl);
    
    // Salvează rezultatul în baza de date
    await databaseService.saveProcessingResult(requestId, result);
    
    console.log(`Documentul cu ID ${requestId} a fost procesat cu succes`);
  } catch (error) {
    console.error(`Eroare la procesarea documentului ${requestId}:`, error);
    
    // Structurează informațiile de eroare pentru a fi mai utile
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
    
    // Actualizează statusul în caz de eroare cu detalii
    await databaseService.updateProcessingStatus(requestId, 'failed', JSON.stringify(errorDetails));
  }
}

// Rută pentru verificarea statusului unei procesări
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