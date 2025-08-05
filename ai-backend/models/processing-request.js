/**
 * Model pentru cererea de procesare
 */
class ProcessingRequest {
  constructor(data) {
    this.id = data.id;
    this.fileName = data.fileName;
    this.fileType = data.fileType;
    this.fileSize = data.fileSize;
    this.blobUrl = data.blobUrl;
    this.status = data.status || 'pending';
    this.errorMessage = data.errorMessage;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Metodă pentru transformarea în JSON pentru API
  toApiResponse() {
    return {
      id: this.id,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      status: this.status,
      uploadDate: this.createdAt
    };
  }
}

module.exports = ProcessingRequest;