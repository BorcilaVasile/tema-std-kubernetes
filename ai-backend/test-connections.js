require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const { AzureKeyCredential, DocumentAnalysisClient } = require('@azure/ai-form-recognizer');
const sql = require('mssql');

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

function getAdoNetConnectionString(connectionString) {
  if (!connectionString) return null;

  if (connectionString.startsWith('Server=tcp:')) {
    return connectionString;
  }

  if (connectionString.includes('Driver=') || connectionString.includes('Driver={')) {
    console.log('Detectat format de conexiune ODBC. Se convertește în format ADO.NET...');

    let server = connectionString.match(/Server=([^;]+)/i)?.[1];
    let database = connectionString.match(/Initial Catalog=([^;]+)/i)?.[1] ||
      connectionString.match(/Database=([^;]+)/i)?.[1];
    let userId = connectionString.match(/User ID=([^;]+)/i)?.[1] ||
      connectionString.match(/UID=([^;]+)/i)?.[1];
    let password = connectionString.match(/Password=([^;]+)/i)?.[1] ||
      connectionString.match(/PWD=([^;]+)/i)?.[1];

    if (!server) server = 'ai-docs-server.database.windows.net,1433';
    if (!database) database = 'ai-documents-db';
    if (!userId) userId = 'dbadmin';

    return `Server=tcp:${server};Initial Catalog=${database};Persist Security Info=False;User ID=${userId};Password=${password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
  }

  return connectionString;
}

async function testConnections() {
  console.log('Testarea conexiunilor la serviciile Azure...');

  try {
    console.log('Testare Blob Storage...');
    const containerClient = blobServiceClient.getContainerClient('uploads');
    const exists = await containerClient.exists();
    console.log(`Container 'uploads' există: ${exists}`);

    if (!exists) {
      console.log('Se creează containerul...');
      await containerClient.create();
      console.log('Container creat cu succes.');
    }
  } catch (error) {
    console.error('Eroare la testarea Blob Storage:', error.message);
  }

  try {
    console.log('Testare Form Recognizer...');

    const client = new DocumentAnalysisClient(
      process.env.FORM_RECOGNIZER_ENDPOINT,
      new AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY)
    );

    console.log('Form Recognizer client creat cu succes');

    console.log(`Endpoint Form Recognizer: ${process.env.FORM_RECOGNIZER_ENDPOINT}`);

    if (client.pipeline) {
      console.log('Client Form Recognizer validat');
    }

  } catch (error) {
    console.error('Eroare la testarea Form Recognizer:', error.message);
    console.error('Verificați cheia și endpoint-ul Form Recognizer din fișierul .env');
  }

  try {
    console.log('\n=== Testare SQL Server cu string de conexiune ===');
    const originalConnectionString = process.env.SQL_CONNECTION_STRING;
    const adoNetConnectionString = getAdoNetConnectionString(originalConnectionString);

    console.log('String de conexiune original: ' +
      (originalConnectionString?.replace(/(?<=Password=)[^;]+/g, '***') || 'Nespecificat'));

    if (adoNetConnectionString !== originalConnectionString) {
      console.log('String de conexiune ADO.NET convertit: ' +
        adoNetConnectionString.replace(/(?<=Password=)[^;]+/g, '***'));

      console.log('\nSe încearcă conexiunea cu string-ul ADO.NET...');
      await sql.connect(adoNetConnectionString);
    } else {
      console.log('\nSe încearcă conexiunea cu string-ul existent...');
      await sql.connect(originalConnectionString);
    }

    console.log('Conexiune SQL Server reușită!');

    const dbadminCheck = await sql.query`SELECT name, type_desc FROM sys.database_principals WHERE name = 'dbadmin'`;
    console.log('\nVerificare utilizator dbadmin:', dbadminCheck.recordset);

    const rolesCheck = await sql.query`
      SELECT DP1.name AS DatabaseRoleName, DP2.name AS DatabaseUserName
      FROM sys.database_role_members DRM
      JOIN sys.database_principals DP1 ON DRM.role_principal_id = DP1.principal_id
      JOIN sys.database_principals DP2 ON DRM.member_principal_id = DP2.principal_id
      WHERE DP2.name = 'dbadmin'
    `;
    console.log('Roluri atribuite utilizatorului dbadmin:', rolesCheck.recordset);

    if (adoNetConnectionString !== originalConnectionString) {
      console.log('\n=== RECOMANDARE ===');
      console.log('Conexiunea funcționează cu string-ul ADO.NET. Vă recomandăm să actualizați fișierul .env cu noul string de conexiune:');
      console.log('SQL_CONNECTION_STRING=' + adoNetConnectionString.replace(/(?<=Password=)[^;]+/g, 'YOUR_PASSWORD'));
    }

    await sql.close();
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '=== EROARE CONEXIUNE SQL SERVER cu string ===');
    console.error('Mesaj eroare:', error.message);
    console.error('Cod eroare:', error.code || 'Nedisponibil');
  }

  try {
    console.log('\n=== Testare SQL Server cu obiect config ===');

    const config = {
      server: 'ai-docs-server.database.windows.net',
      database: 'ai-documents-db',
      user: 'dbadmin',
      password: 'STDhomework#2',
      options: {
        encrypt: true,
        trustServerCertificate: false,
        port: 1433
      }
    };

    console.log('Se încearcă conexiunea cu obiectul config...');

    if (sql.connected) await sql.close();

    await sql.connect(config);
    console.log('Conexiune SQL Server reușită cu obiectul config!');

    await sql.close();
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', '=== EROARE CONEXIUNE SQL SERVER cu config ===');
    console.error('Mesaj eroare:', error.message);
    console.error('Cod eroare:', error.code || 'Nedisponibil');
  }
}

testConnections().catch(console.error);