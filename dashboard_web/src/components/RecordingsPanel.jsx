import React, { useState, useEffect } from 'react';
import './RecordingsPanel.css';

const SERVER = 'http://localhost:8000';

export default function RecordingsPanel() {
  const [recordings, setRecordings] = useState([]);
  const [selectedRec, setSelectedRec] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`${SERVER}/api/v1/recordings/list`);
      const data = await res.json();
      setRecordings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    }
  };

  const handleDelete = async recId => {
    if (!window.confirm('Delete this recording?')) return;
    try {
      await fetch(`${SERVER}/api/v1/recordings/${recId}`, {
        method: 'DELETE',
      });
      fetchRecordings();
      if (selectedRec?.id === recId) setSelectedRec(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDownload = (recId, filename) => {
    window.location.href = `${SERVER}/api/v1/recordings/download/${recId}`;
  };

  return (
    <div className="recordings-panel">
      <h2>📹 Screen Recordings</h2>

      <div className="recordings-container">
        {/* Video Player */}
        {selectedRec && (
          <div className="video-player">
            <video
              width="100%"
              height="auto"
              controls
              autoPlay
              style={{
                backgroundColor: '#000',
                borderRadius: '8px',
                maxHeight: '500px',
              }}
            >
              <source
                src={`${SERVER}/api/v1/recordings/download/${selectedRec.id}`}
                type="video/mp4"
              />
              Your browser does not support HTML5 video.
            </video>
            <div className="video-info">
              <p>
                <strong>File:</strong> {selectedRec.filename}
              </p>
              <p>
                <strong>Duration:</strong> {selectedRec.duration_secs}s
              </p>
              <p>
                <strong>Frames:</strong> {selectedRec.frame_count}
              </p>
              <p>
                <strong>Size:</strong> {selectedRec.size_mb} MB
              </p>
              <p>
                <strong>Time:</strong>{' '}
                {new Date(selectedRec.start_time * 1000).toLocaleString()}
              </p>
            </div>
            <button onClick={() => setSelectedRec(null)} className="btn-close">
              ✕ Close Player
            </button>
          </div>
        )}

        {/* Recordings List */}
        <div className="recordings-list">
          <h3>Saved Recordings ({recordings.length})</h3>
          {recordings.length === 0 ? (
            <p className="empty">
              No recordings yet. Start recording from the Dashboard.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Venue</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Size</th>
                    <th>Frames</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recordings.map(rec => (
                    <tr
                      key={rec.id}
                      className={selectedRec?.id === rec.id ? 'active' : ''}
                    >
                      <td>
                        <strong>{rec.venue_id}</strong>
                      </td>
                      <td>
                        {new Date(rec.start_time * 1000).toLocaleString()}
                      </td>
                      <td>{rec.duration_secs}s</td>
                      <td>{rec.size_mb} MB</td>
                      <td>{rec.frame_count}</td>
                      <td className="actions">
                        <button
                          className="btn-play"
                          onClick={() => setSelectedRec(rec)}
                          title="Play recording"
                        >
                          ▶ Play
                        </button>
                        <button
                          className="btn-download"
                          onClick={() => handleDownload(rec.id, rec.filename)}
                          title="Download recording"
                        >
                          ⬇ Download
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(rec.id)}
                          title="Delete recording"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
