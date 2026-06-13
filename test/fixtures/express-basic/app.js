const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  res.json({ users: [], page, limit });
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ id: 1, name, email });
});

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId, name: 'John' });
});

app.put('/users/:id', (req, res) => {
  const { name, email } = req.body;
  res.json({ id: req.params.id, name, email });
});

app.delete('/users/:id', (req, res) => {
  res.status(204).send();
});

module.exports = app;
