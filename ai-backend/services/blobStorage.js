const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} = require("@azure/storage-blob");
const config = require('../config/azure');

class BlobStorageService {
  constructor() {
    if (!config.storage.connectionString) {
      console.error('EROARE: AZURE_STORAGE_CONNECTION_STRING nu este definit în fișierul .env');
      console.error('Te rugăm să adaugi connection string-ul corect în fișierul .env');
      this.blobServiceClient = null;
      this.containerClient = null;
      this.sharedKeyCredential = null;
    } else {
      const connStr = config.storage.connectionString;
      const accountNameMatch = connStr.match(/AccountName=([^;]+)/);
      const accountKeyMatch = connStr.match(/AccountKey=([^;]+)/);

      if (!accountNameMatch || !accountKeyMatch) {
        console.error('EROARE: Connection string invalid - lipsește AccountName sau AccountKey');
        this.blobServiceClient = null;
        this.containerClient = null;
        this.sharedKeyCredential = null;
      } else {
        this.accountName = accountNameMatch[1];
        this.accountKey = accountKeyMatch[1];

        this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);

        this.blobServiceClient = BlobServiceClient.fromConnectionString(config.storage.connectionString);
        this.containerClient = this.blobServiceClient.getContainerClient(config.storage.containerName);

        console.log(`Blob Storage configurat pentru contul: ${this.accountName}`);
      }
    }
  }

  async initialize() {
    try {
      if (!this.blobServiceClient) {
        throw new Error('Blob Storage Service nu a fost inițializat corect');
      }

      const containerExists = await this.containerClient.exists();
      if (!containerExists) {
        console.log(`Crearea containerului: ${config.storage.containerName}`);
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

      const blobName = `${Date.now()}-${fileName.replace(/[/\\?%*:|"<>]/g, '')}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.upload(fileBuffer, fileBuffer.length);

      const sasUrl = await this.generateSasUrlForBlob(blobName);

      console.log(`Blob uploaded and accessible at: ${sasUrl}`);

      return sasUrl;
    } catch (error) {
      console.error('Eroare la încărcarea fișierului în Blob Storage:', error);
      throw error;
    }
  }

  async generateSasUrlForBlob(blobName) {
    try {
      if (!this.sharedKeyCredential) {
        throw new Error('Credențialele Storage nu sunt disponibile pentru generarea SAS');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const expiresOn = new Date();
      expiresOn.setHours(expiresOn.getHours() + 2);

      const sasOptions = {
        containerName: this.containerClient.containerName,
        blobName: blobName,
        permissions: BlobSASPermissions.parse("r"),
        startsOn: new Date(Date.now() - 5 * 60 * 1000),
        expiresOn: expiresOn,
        protocol: "https"
      };

      const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        this.sharedKeyCredential
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
      const url = new URL(blobUrl);
      const pathSegments = url.pathname.split('/');
      const blobName = pathSegments[pathSegments.length - 1];

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();

      return true;
    } catch (error) {
      console.error('Eroare la ștergerea fișierului din Blob Storage:', error);
      throw error;
    }
  }

  async generateSasUrl(blobName, expiryMinutes = 60) {
    const blobClient = this.containerClient.getBlockBlobClient(blobName);
    const startsOn = new Date();
    const expiresOn = new Date(startsOn);
    expiresOn.setMinutes(startsOn.getMinutes() + expiryMinutes);

    const sasOptions = {
      containerName: this.containerClient.containerName,
      blobName: blobName,
      permissions: BlobSASPermissions.parse("r"),
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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

const blobStorageService = new BlobStorageService();

module.exports = blobStorageService;