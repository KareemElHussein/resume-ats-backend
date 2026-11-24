import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import resumeRoutes from './routes/resumes.js';
import jobRoutes from './routes/jobDescriptions.js';
import analysisRoutes from './routes/analyses.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' })); // rejects oversized bodies
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/job-descriptions', jobRoutes);
app.use('/api/analyses', analysisRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));

// Central error handler: clear messages for the client, details only in the server log.
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large. Keep the text under 20,000 characters.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

export default app;
