import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as api from "../api/client";

export default function ResumeHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState("");

  function load() {
    api.getResumeHistory(id).then(setVersions).catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function handleRestore(versionId) {
    if (!confirm("Restore this version? This will overwrite the current resume.")) return;
    try {
      await api.restoreVersion(id, versionId);
      navigate(`/resumes/${id}`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">{versions.length} {versions.length === 1 ? "entry" : "entries"} in ledger</span>
          <h1>Resume History</h1>
        </div>
        <Link to={`/resumes/${id}`}>Back to Resume</Link>
      </div>
      {error && <p className="error">{error}</p>}
      {versions.length === 0 ? (
        <p>No history yet.</p>
      ) : (
        <ul className="history-list">
          {versions.map((v, idx) => (
            <li key={v.id} className="history-item">
              <div className="history-item-main">
                <span className="history-seal">V{String(versions.length - idx).padStart(2, "0")}</span>
                <div>
                  <strong>{v.title}</strong>
                  <span className="muted">{new Date(v.created_at).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => handleRestore(v.id)}>Restore</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
