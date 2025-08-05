-- Crearea tabelului pentru cererile de procesare
CREATE TABLE ProcessingRequests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    fileName NVARCHAR(255) NOT NULL,
    fileType NVARCHAR(100) NOT NULL,
    fileSize BIGINT NOT NULL,
    blobUrl NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    errorMessage NVARCHAR(MAX) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Crearea tabelului pentru rezultatele procesării
CREATE TABLE ProcessingResults (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    requestId UNIQUEIDENTIFIER NOT NULL,
    resultData NVARCHAR(MAX) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ProcessingResults_ProcessingRequests FOREIGN KEY (requestId)
        REFERENCES ProcessingRequests (id)
);

-- Crearea unui index pentru căutări mai rapide
CREATE INDEX IX_ProcessingRequests_Status ON ProcessingRequests (status);
CREATE INDEX IX_ProcessingResults_RequestId ON ProcessingResults (requestId);