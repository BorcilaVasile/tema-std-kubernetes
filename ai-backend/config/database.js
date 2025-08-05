const sql = require('mssql');
const connectionString = process.env.SQL_CONNECTION_STRING;

// Export the configuration object directly
const config = {
  server: 'ai-docs-server.database.windows.net',
  database: 'ai-documents-db',
  user: 'dbadmin',
  password: 'STDhomework#2',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    port: 1433,
    connectTimeout: 30000, // Mărește timeout-ul la 30 secunde
    requestTimeout: 30000
  }
};

// Pentru debugging
console.log('Configurare SQL:', {
  server: config.server,
  database: config.database,
  user: config.user,
  options: {
    encrypt: config.options.encrypt,
    connectTimeout: config.options.connectTimeout
  }
});

module.exports = config;