import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Sparkles, Building, Info } from "lucide-react";

function UploadDocument() {
  const [file, setFile] = useState(null);
  const [company, setCompany] = useState("TCS");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const companies = [
    { name: "TCS", color: "#3b82f6" },
    { name: "Amazon", color: "#f59e0b" },
    { name: "Microsoft", color: "#06b6d4" },
    { name: "Google", color: "#ef4444" },
    { name: "Infosys", color: "#6366f1" },
    { name: "Accenture", color: "#a855f7" },
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError("");
    setMessage("");
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported. Please upload an interview or syllabus PDF.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please choose a smaller PDF.");
      return;
    }
    setFile(selectedFile);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!file) {
      setError("Please select or drop a PDF file to upload.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("company", company);

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload and process document.");
      }

      setMessage(`"${file.name}" was successfully uploaded and indexed for ${company}! You can now query it in Chat.`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err.message || "Unable to upload PDF. Please verify your backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <div className="upload-title-row">
          <div className="upload-icon-badge">
            <UploadCloud size={24} />
          </div>
          <div>
            <h2>Upload Preparation Material</h2>
            <p>Upload college placement brochures, company-specific question banks, or DSA guides.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleUpload} className="upload-form">
        {/* Company Selection Chips */}
        <div className="upload-section">
          <label className="section-title">
            <Building size={16} />
            <span>Target Company</span>
          </label>
          <div className="company-chips-grid">
            {companies.map((item) => (
              <button
                type="button"
                key={item.name}
                className={`company-chip ${company === item.name ? "active" : ""}`}
                onClick={() => setCompany(item.name)}
              >
                <span className="chip-indicator" style={{ backgroundColor: item.color }}></span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone */}
        <div className="upload-section">
          <label className="section-title">
            <FileText size={16} />
            <span>Document File</span>
          </label>

          {!file ? (
            <div
              className={`dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
              />
              <div className="dropzone-icon">
                <UploadCloud size={40} />
              </div>
              <h4>Drag & drop your PDF file here</h4>
              <p>or click to browse your local documents (Max 10MB)</p>
              <span className="file-badge">PDF only</span>
            </div>
          ) : (
            <div className="file-preview-card">
              <div className="file-info-group">
                <div className="pdf-icon-badge">
                  <FileText size={24} />
                </div>
                <div className="file-meta">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatFileSize(file.size)} • Ready for indexing</div>
                </div>
              </div>
              <button
                type="button"
                className="remove-file-btn"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                aria-label="Remove selected file"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="upload-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="upload-alert success">
            <CheckCircle2 size={18} />
            <span>{message}</span>
          </div>
        )}

        {/* Info Card */}
        <div className="upload-info-card">
          <Info size={18} />
          <div>
            <strong>How RAG Indexing Works:</strong> When you upload a PDF, text embeddings are created and stored in the vector database with company tags. When you ask questions, relevant pages are automatically retrieved and cited.
          </div>
        </div>

        {/* Submit Button */}
        <button type="submit" className="upload-submit-btn" disabled={loading || !file}>
          {loading ? (
            <div className="btn-spinner-content">
              <div className="spinner"></div>
              <span>Uploading & Processing Embeddings...</span>
            </div>
          ) : (
            <div className="btn-content">
              <Sparkles size={18} />
              <span>Index Document for {company}</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
}

export default UploadDocument;