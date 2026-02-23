class ProcessingResult {
  constructor(data) {
    this.id = data.id;
    this.requestId = data.requestId;
    this.fileName = data.fileName;
    this.fileType = data.fileType;
    this.resultData = data.resultData;
    this.processingDate = data.processingDate || new Date();
  }

  toApiResponse() {
    return {
      id: this.id,
      requestId: this.requestId,
      fileName: this.fileName,
      fileType: this.fileType,
      processingDate: this.processingDate,
      resultData: this.resultData
    };
  }
}

module.exports = ProcessingResult;