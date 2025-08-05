const { 
  BlobServiceClient, 
  generateBlobSASQueryParameters, 
  BlobSASPermissions 
} = require("@azure/storage-blob");
const config = require('../config/azure');

class BlobStorageService {
  constructor() {
    if (!config.storage.connectionString) {
      console.error('EROARE: AZURE_STORAGE_CONNECTION_STRING nu este definit în fișierul .env');
      console.error('Te rugăm să adaugi connection string-ul corect în fișierul .env');
      // Creăm un obiect simplu pentru a evita erorile la momentul inițializării
      this.blobServiceClient = null;
      this.containerClient = null;
    } else {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.storage.connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(config.storage.containerName);
    }
  }

  async initialize() {
    try {
      // Verifică dacă serviciul a fost inițializat corect
      if (!this.blobServiceClient) {
        throw new Error('Blob Storage Service nu a fost inițializat corect');
      }
      
      // Verifică dacă containerul există, dacă nu, îl creează
      const containerExists = await this.containerClient.exists();
      if (!containerExists) {
        console.log(`Crearea containerului: ${config.storage.containerName}`);
        // Creează containerul fără acces public (private)
        await this.containerClient.create();
        console.log(`Containerul ${config.storage.containerName} a fost creat (private)`);
      }
      
      console.log('Blob Storage inițializat - se vor folosi token-uri SAS pentru acces');
    } catch (error) {
      console.error('Eroare la inițializarea Blob Storage:', error);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      await this.initialize();
      
      // Generează un nume unic pentru blob
      const blobName = `${Date.now()}-${fileName.replace(/[/\\?%*:|"<>]/g, '')}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      // Încarcă fișierul
      await blockBlobClient.upload(fileBuffer, fileBuffer.length);
      
      // Obține URL-ul cu SAS pentru Form Recognizer
      const sasUrl = await this.generateSasUrlForBlob(blobName);
      
      console.log(`Blob uploaded and accessible at: ${sasUrl}`);
      
      return sasUrl;
    } catch (error) {
      console.error('Eroare la încărcarea fișierului în Blob Storage:', error);
      throw error;
    }
  }

  // Adaugă o metodă nouă pentru generarea unui SAS optimizat pentru Form Recognizer
  async generateSasUrlForBlob(blobName) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      // Generează un SAS cu valabilitate extinsă pentru Form Recognizer
      const expiresOn = new Date();
      expiresOn.setHours(expiresOn.getHours() + 2); // Expiră în 2 ore (mai mult timp)
      
      const sasOptions = {
        containerName: this.containerClient.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse("r"), // Doar permisiune de citire
        startsOn: new Date(Date.now() - 5 * 60 * 1000), // Start cu 5 minute în urmă pentru sincronizare
        expiresOn: expiresOn,
        protocol: "https"
      };
      
      // Generează token-ul SAS
      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        this.blobServiceClient.credential
      ).toString();
      
      const sasUrl = `${blockBlobClient.url}?${sasToken}`;
      console.log(`SAS URL generat pentru ${blobName}: ${sasUrl.substring(0, 100)}...`);
      
      return sasUrl;
    } catch (error) {
      console.error('Eroare la generarea SAS URL:', error);
      throw error;
    }
  }

  async deleteFile(blobUrl) {
    try {
      // Extrage numele blob-ului din URL
      const url = new URL(blobUrl);
      const pathSegments = url.pathname.split('/');
      const blobName = pathSegments[pathSegments.length - 1];
      
      // Șterge blob-ul
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      
      return true;
    } catch (error) {
      console.error('Eroare la ștergerea fișierului din Blob Storage:', error);
      throw error;
    }
  }

  // În serviciul blobStorage.js, adaugă această metodă
  async generateSasUrl(blobName, expiryMinutes = 60) {
    const blobClient = this.containerClient.getBlockBlobClient(blobName);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn);
    expiresOn.setMinutes(startsOn.getMinutes() + expiryMinutes);
    
    const sasOptions = {
      containerName: this.containerClient.containerName,
      blobName: blobName,
      permissions: BlobSASPermissions.parse("r"), // Doar citire
      startsOn,
      expiresOn
    };
    
    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      this.blobServiceClient.credential
    ).toString();
    
    return `${blobClient.url}?${sasToken}`;
  }

  async testBlobAccess(blobUrl) {
    try {
      console.log(`Testing access to blob: ${blobUrl}`);
      
      // Adăugăm timeout și opțiuni specifice pentru fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secunde timeout
      
      const response = await fetch(blobUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Blob access successful (${response.status} ${response.statusText})`);
        return true;
      } else {
        console.error(`Blob access failed: ${response.status} ${response.statusText}`);
        
        // Pentru mai multe detalii despre eroare
        const fullResponse = await fetch(blobUrl);
        const errorText = await fullResponse.text();
        console.error(`Error details: ${errorText}`);
        
        return false;
      }
    } catch (error) {
      console.error('Error testing blob access:', error);
      return false;
    }
  }
}

// Instanțiază serviciul
const blobStorageService = new BlobStorageService();

// Exportă serviciul
module.exports = blobStorageService;