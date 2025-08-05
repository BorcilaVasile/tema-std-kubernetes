const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");
const config = require('../config/azure');

class FormRecognizerService {
  constructor() {
    const endpoint = process.env.FORM_RECOGNIZER_ENDPOINT;
    const key = process.env.FORM_RECOGNIZER_KEY;

    // Verifică existența variabilelor
    if (!endpoint || !key) {
      throw new Error('Azure Form Recognizer credentials missing!');
    }

    // Verifică formatul endpoint
    if (!endpoint.startsWith('https://')) {
      throw new Error('Invalid endpoint format. Must start with https://');
    }

    this.client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key.trim()));

    if(!this.client){ 
      throw new Error('Form Recognizer client could not be initialized');
    }

    console.log('Form Recognizer Service initialized successfully');
  }

  async analyzeDocument(documentUrl, modelId = 'prebuilt-document') {
    if (!this.client) {
      throw new Error('Form Recognizer Service nu a fost inițializat corect');
    }
    
    try {
      console.log(`Analyzing document: ${documentUrl}`);
      
      // Test URL accessibility before sending to Form Recognizer
      try {
        const urlTest = await fetch(documentUrl, { 
          method: 'HEAD',
          headers: { 'Cache-Control': 'no-cache' } 
        });
        
        if (!urlTest.ok) {
          throw {
            code: 'AccessError',
            message: 'URL-ul documentului nu este accesibil',
            details: `Status: ${urlTest.status}, StatusText: ${urlTest.statusText}`,
            technicalDetails: 'Verificați dacă URL-ul este valid și accesibil public'
          };
        }
      } catch (fetchError) {
        console.error('Error fetching document URL:', fetchError);
        throw {
          code: 'NetworkError',
          message: 'Nu s-a putut accesa URL-ul documentului',
          details: fetchError.message,
          technicalDetails: 'Verificați conexiunea la rețea și validitatea URL-ului'
        };
      }
      
      console.log('Document URL accessible, proceeding with analysis...');
      
      // Utilizează Form Recognizer pentru analiza documentului
      const poller = await this.client.beginAnalyzeDocumentFromUrl(modelId, documentUrl);
      const result = await poller.pollUntilDone();
      
      if (!result) {
        throw new Error('Analiza documentului a eșuat');
      }
      
      console.log('Document analyzed successfully');
      
      // Extragere conținut
      const content = result.content;
      
      return {
        pageCount: result.pages ? result.pages.length : 0,
        content: content,
        tables: result.tables || [],
        keyValuePairs: result.keyValuePairs || [],
        entities: result.entities || [],
        styles: result.styles || []
      };
    } catch (error) {
      // Construiește un obiect de eroare mai detaliat
      const errorDetails = {
        message: error.message || 'Eroare la analiza documentului',
        code: error.code || 'ProcessingError',
        timestamp: new Date().toISOString(),
        documentUrl: documentUrl.split('?')[0], // Eliminăm tokenul SAS pentru securitate
        technicalDetails: error.details || error.innererror?.message || JSON.stringify(error),
        suggestions: [
          'Verificați dacă documentul este într-un format suportat (PDF, JPEG, PNG, TIFF)',
          'Asigurați-vă că URL-ul documentului este accesibil public',
          'Verificați dacă documentul nu este corupt sau protejat prin parolă'
        ]
      };
      
      console.error(`Eroare detaliată la analiza documentului:`, errorDetails);
      throw errorDetails;
    }
  }

  async extractText(documentUrl) {
    try {
      const poller = await this.client.beginAnalyzeDocumentFromUrl('prebuilt-read', documentUrl);
      const result = await poller.pollUntilDone();
      
      if (!result) {
        throw new Error('Extragerea textului a eșuat');
      }
      
      // Formatează rezultatul
      const text = result.content;
      
      const pages = result.pages.map(page => ({
        number: page.pageNumber,
        text: page.lines?.map(line => line.content).join('\n') || '',
        width: page.width,
        height: page.height
      }));
      
      return { text, pages };
    } catch (error) {
      console.error('Eroare la extragerea textului:', error);
      throw error;
    }
  }

  async analyzeLayout(documentUrl) {
    try {
      const poller = await this.client.beginAnalyzeDocumentFromUrl('prebuilt-layout', documentUrl);
      const result = await poller.pollUntilDone();
      
      if (!result) {
        throw new Error('Analiza layout-ului a eșuat');
      }
      
      const paragraphs = result.paragraphs?.map(para => ({
        content: para.content,
        boundingBox: para.boundingRegions?.[0]?.polygon || []
      })) || [];
      
      return {
        tables: result.tables || [],
        paragraphs: paragraphs,
        pageCount: result.pages?.length || 0
      };
    } catch (error) {
      console.error('Eroare la analiza layout-ului:', error);
      throw error;
    }
  }
}

// Instanțiază serviciul
const formRecognizerService = new FormRecognizerService();

// Exportă serviciul
module.exports = formRecognizerService;