const sql = require('mssql');
const config = require('../config/database');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isDbAvailable = false;
    
    // In-memory storage for fallback mode
    this.inMemoryRequests = new Map();
    this.inMemoryResults = new Map();
  }

  async connect() {
    try {
      console.log('Încercare conectare la SQL Server...');
      this.pool = await sql.connect(config);  // Using config object
      this.isDbAvailable = true;
      console.log('Conectat cu succes la baza de date SQL Server');
      return true;
    } catch (error) {
      this.isDbAvailable = false;
      console.error('Eroare la conectarea la baza de date:', error.message);
      console.error('Detalii eroare:', error);
      console.log('Aplicația va funcționa fără persistență în baza de date.');
      return false;
    }
  }

  async initialize() {
    try {
      if (!this.pool) {
        console.log('Încercare conectare la SQL Server...');
        
        // Use config object instead of connection string
        this.pool = await sql.connect(config);
        console.log('Conectat cu succes la baza de date Azure SQL');
        this.isDbAvailable = true;
      }
    } catch (error) {
      console.error('Eroare la conectarea la baza de date:', error.message);
      console.error('Detalii eroare:', error);
      console.log('Aplicația va funcționa fără persistență în baza de date.');
      this.isDbAvailable = false;
    }
  }

  async createProcessingRequest(requestData) {
    if (!this.isDbAvailable) {
      console.log('Baza de date nu este disponibilă, se generează un ID local');
      const requestId = `local-${Date.now()}`;
      
      // Store in memory
      this.inMemoryRequests.set(requestId, {
        id: requestId,
        fileName: requestData.fileName,
        fileType: requestData.fileType,
        fileSize: requestData.fileSize,
        blobUrl: requestData.blobUrl,
        status: requestData.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('In-memory request stored:', requestId, this.inMemoryRequests.has(requestId));
      
      return requestId;
    }
    
    try {
      await this.initialize();
      
      const result = await this.pool.request()
        .input('fileName', sql.NVarChar, requestData.fileName)
        .input('fileType', sql.NVarChar, requestData.fileType)
        .input('fileSize', sql.BigInt, requestData.fileSize)
        .input('blobUrl', sql.NVarChar, requestData.blobUrl)
        .input('status', sql.NVarChar, requestData.status || 'pending')
        .query(`
          INSERT INTO ProcessingRequests (fileName, fileType, fileSize, blobUrl, status)
          OUTPUT INSERTED.id
          VALUES (@fileName, @fileType, @fileSize, @blobUrl, @status)
        `);
      
      return result.recordset[0].id;
    } catch (error) {
      console.error('Eroare la crearea cererii de procesare:', error);
      return `fallback-${Date.now()}`;
    }
  }

  async updateProcessingStatus(requestId, status, errorMessage = null) {
    if (!this.isDbAvailable) {
      console.log('Baza de date nu este disponibilă, actualizarea statusului se face in memorie');
      
      if (this.inMemoryRequests.has(requestId)) {
        const request = this.inMemoryRequests.get(requestId);
        request.status = status;
        request.errorMessage = errorMessage;
        request.updatedAt = new Date();
        return true;
      }
      
      return false;
    }
    
    try {
      await this.initialize();
      
      await this.pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('status', sql.NVarChar, status)
        .input('errorMessage', sql.NVarChar, errorMessage)
        .input('updatedAt', sql.DateTime2, new Date())
        .query(`
          UPDATE ProcessingRequests
          SET status = @status,
              errorMessage = @errorMessage,
              updatedAt = @updatedAt
          WHERE id = @requestId
        `);
      
      return true;
    } catch (error) {
      console.error('Eroare la actualizarea statusului de procesare:', error);
      return false;
    }
  }

  async saveProcessingResult(requestId, resultData) {
    if (!this.isDbAvailable) {
      console.log('Baza de date nu este disponibilă, salvarea rezultatului se face in memorie');
      
      // Update status to completed
      this.updateProcessingStatus(requestId, 'completed');
      
      // Store result in memory
      this.inMemoryResults.set(requestId, {
        id: `result-${Date.now()}`,
        requestId: requestId,
        resultData: resultData,
        processingDate: new Date()
      });
      
      return true;
    }
    
    try {
      await this.initialize();
      
      // Actualizează statusul cererii la 'completed'
      await this.updateProcessingStatus(requestId, 'completed');
      
      // Salvează rezultatul procesării
      await this.pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .input('resultData', sql.NVarChar, JSON.stringify(resultData))
        .query(`
          INSERT INTO ProcessingResults (requestId, resultData)
          VALUES (@requestId, @resultData)
        `);
      
      return true;
    } catch (error) {
      console.error('Eroare la salvarea rezultatului procesării:', error);
      return false;
    }
  }

  async getProcessingRequest(requestId) {
    // Check if the ID is a fallback/local ID
    if (requestId.toString().startsWith('fallback-') || requestId.toString().startsWith('local-')) {
      console.log('ID de tip fallback detectat, se caută în memoria locală:', requestId);
      return this.inMemoryRequests.get(requestId) || null;
    }
    
    // If database is unavailable, check in-memory storage
    if (!this.isDbAvailable) {
      console.log('Baza de date nu este disponibilă, se caută în memoria locală');
      return this.inMemoryRequests.get(requestId) || null;
    }
    
    try {
      await this.initialize();
      
      // Check if requestId is a valid GUID
      const isValidGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
      
      if (!isValidGuid) {
        console.log('ID-ul nu este un GUID valid, se caută în memoria locală');
        return this.inMemoryRequests.get(requestId) || null;
      }
      
      const result = await this.pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query('SELECT * FROM ProcessingRequests WHERE id = @requestId');
        
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Eroare la obținerea cererii de procesare:', error);
      
      // If SQL error, fall back to in-memory search
      return this.inMemoryRequests.get(requestId) || null;
    }
  }

  async getProcessingResult(requestId) {
    if (!this.isDbAvailable) {
      console.log('Baza de date nu este disponibilă, se caută rezultatul în memoria locală');
      return this.inMemoryResults.get(requestId) || null;
    }
    
    try {
      await this.initialize();
      
      const result = await this.pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT r.id, r.requestId, r.resultData, r.createdAt,
                 p.fileName, p.fileType, p.status
          FROM ProcessingResults r
          JOIN ProcessingRequests p ON r.requestId = p.id
          WHERE r.requestId = @requestId
        `);
      
      if (result.recordset.length === 0) {
        return null;
      }
      
      const record = result.recordset[0];
      return {
        id: record.id,
        requestId: record.requestId,
        fileName: record.fileName,
        fileType: record.fileType,
        status: record.status,
        resultData: JSON.parse(record.resultData),
        processingDate: record.createdAt
      };
    } catch (error) {
      console.error('Eroare la obținerea rezultatului procesării:', error);
      return null;
    }
  }

  async getProcessingHistory() {
    if (!this.isDbAvailable) {
      console.log('Baza de date nu este disponibilă, se returnează istoricul din memoria locală');
      return Array.from(this.inMemoryRequests.values())
        .map(req => ({
          id: req.id,
          fileName: req.fileName,
          fileType: req.fileType,
          fileSize: req.fileSize,
          status: req.status,
          uploadDate: req.createdAt
        }));
    }
    
    try {
      await this.initialize();
      
      const result = await this.pool.request().query(`
        SELECT id, fileName, fileType, fileSize, status, createdAt as uploadDate
        FROM ProcessingRequests
        ORDER BY createdAt DESC
      `);
      
      return result.recordset;
    } catch (error) {
      console.error('Eroare la obținerea istoricului de procesare:', error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();