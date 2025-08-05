require('dotenv').config();

module.exports = {
  formRecognizer: {
    key: process.env.FORM_RECOGNIZER_KEY,
    endpoint: process.env.FORM_RECOGNIZER_ENDPOINT
  },
  storage: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: 'uploads'
  },
  sqlDatabase: {
    connectionString: process.env.SQL_CONNECTION_STRING
  }
};

console.log('Direct Form Recognizer values:', {
  endpoint: process.env.FORM_RECOGNIZER_ENDPOINT,
  keyLength: process.env.FORM_RECOGNIZER_KEY?.length
});

console.log('Config object Form Recognizer values:', {
  endpoint: module.exports.formRecognizer?.endpoint,
  keyLength: module.exports.formRecognizer?.key?.length
});