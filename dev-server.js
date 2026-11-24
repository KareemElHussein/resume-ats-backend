import express from 'express';
import app from './server/app.js';

// Locally, the same server also serves the pages in public/. On Vercel, Vercel serves them.
app.use(express.static('public'));

app.listen(3001, () => console.log('Open http://localhost:3001'));
