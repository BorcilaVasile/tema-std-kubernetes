require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API pentru procesarea documentelor cu AI Form Recognizer' });
});

app.use('/upload', require('./routes/upload'));
app.use('/results', require('./routes/results'));
app.use('/history', require('./routes/history'));
app.use('/status', require('./routes/status'));

app.use('/upload/status', (req, res, next) => {
  console.log('Redirecting /upload/status request to /status');
  req.url = req.url;
  require('./routes/status')(req, res, next);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});
