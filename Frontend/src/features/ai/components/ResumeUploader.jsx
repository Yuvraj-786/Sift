import "../styles/_resumeUploader.scss";
import { useRef, useState } from "react";

/**
 * @name ResumeUploader
 * @description Drag-and-drop / click-to-browse uploader for a single PDF resume.
 * @access Public
 */
function ResumeUploader({ file, onFileSelect }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * @name handleDrop
   * @description Accepts a dropped file if it is a PDF, otherwise ignores it.
   * @access Private
   */
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      onFileSelect(dropped);
    }
  };

  return (
    <div className="resume-uploader">
      <label
        className={`resume-uploader__dropzone ${isDragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="resume-uploader__main">
          {file ? "Replace file" : "Drop your PDF here"}
        </span>
        <span className="resume-uploader__sub">or click to browse</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(event) => onFileSelect(event.target.files[0])}
        />
      </label>

      {file && (
        <div className="resume-uploader__chip">
          <span>{file.name}</span>
          <button type="button" onClick={() => onFileSelect(null)} aria-label="Remove file">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

export default ResumeUploader;