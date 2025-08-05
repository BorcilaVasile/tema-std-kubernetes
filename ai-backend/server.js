require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

// Creează aplicația Express
const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Rute de bază
app.get('/', (req, res) => {
  res.json({ message: 'API pentru procesarea documentelor cu AI Form Recognizer' });
});

// Importă și utilizează rutele
app.use('/upload', require('./routes/upload'));
app.use('/results', require('./routes/results'));
app.use('/history', require('./routes/history'));
app.use('/status', require('./routes/status'));

// Redirecționează cererile de status
app.use('/upload/status', (req, res, next) => {
  console.log('Redirecting /upload/status request to /status');
  req.url = req.url;  // Keep the :requestId part
  require('./routes/status')(req, res, next);
});

// Rută pentru erori 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Gestionarea erorilor globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Pornește serverul
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});
