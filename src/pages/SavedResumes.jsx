import { useEffect, useState } from 'react';
import { api } from '../api';

export default function SavedResumes() {
  const [resumes, setResumes] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    api.listResumes()
      .then((data) => setResumes(data.resumes))
      .catch((err) => {
        if (err.status === 401) window.location.href = '/login';
        else setError(err.message);
      });
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this resume and all its analyses?')) return;
    try {
      await api.deleteResume(id);
      setResumes((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!resumes) return <p>Loading...</p>;
  if (resumes.length === 0) return <p>No saved resumes yet.</p>;

  return (
    <table>
      <thead>
        <tr><th>Resume</th><th>Created</th><th>Latest match score</th><th></th></tr>
      </thead>
      <tbody>
        {resumes.map((r) => (
          <tr key={r.id}>
            <td>{r.title}</td>
            <td>{new Date(r.created_at).toLocaleDateString()}</td>
            <td>{r.latest_match_score == null ? 'Not analyzed yet' : `${r.latest_match_score}/100`}</td>
            <td><button onClick={() => handleDelete(r.id)}>Delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
