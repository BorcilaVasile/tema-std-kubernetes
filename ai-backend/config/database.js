const sql = require('mssql');

function parseConnectionString(connStr) {
  if (!connStr) return null;
  const params = {};
  connStr.split(';').forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) params[key.trim()] = value.trim();
  });
  return params;
}

const connParams = parseConnectionString(process.env.SQL_CONNECTION_STRING);

const config = {
  server: connParams?.Server?.replace('tcp:', '').split(',')[0] || process.env.SQL_SERVER || 'ai-docs-server.database.windows.net',
  database: connParams?.['Initial Catalog'] || process.env.SQL_DATABASE || 'ai-documents-db',
  user: connParams?.['User ID'] || process.env.SQL_USER || 'dbadmin',
  password: connParams?.Password || process.env.SQL_PASSWORD || 'STDhomework#2',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    port: 1433,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

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