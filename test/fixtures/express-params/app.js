const express = require('express');
const app = express();

function validateAuth(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const validateBody = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ error: 'Body required' });
  }
  next();
};

app.get('/api/items', validateAuth, (req, res) => {
  const category = req.query.category;
  const sort = req.query.sort || 'asc';
  const page = parseInt(req.query.page, 10) || 1;
  res.json({ items: [], category, sort, page });
});

app.get('/api/items/:id', validateAuth, async (req, res) => {
  const id = req.params.id;
  const include = req.query.include;
  res.json({ id, name: 'Item', include });
});

app.post('/api/items', validateAuth, validateBody, (req, res) => {
  const { title, description, price } = req.body;
  res.status(201).json({ id: Date.now(), title, description, price });
});

app.put('/api/items/:id', validateAuth, validateBody, (req, res) => {
  const { title, description, price } = req.body;
  res.json({ id: req.params.id, title, description, price });
});

app.patch('/api/items/:id', validateAuth, (req, res) => {
  const updates = req.body;
  res.json({ id: req.params.id, ...updates });
});

app.delete('/api/items/:id', validateAuth, (req, res) => {
  res.status(204).send();
});

app.get('/api/items/:id/reviews', validateAuth, (req, res) => {
  const reviewId = req.query.reviewId;
  res.json({ reviews: [], reviewId });
});

module.exports = app;
