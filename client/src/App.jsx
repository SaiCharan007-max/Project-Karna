import { useEffect, useRef, useState } from "react";
import karnaLogo from "./assets/karna-logo.png";

const apiBase = import.meta.env.VITE_API_URL || "";
const fileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes === 0) return "0 bytes";
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};
const readableType = (file) => file.type || (file.name.includes(".") ? `${file.name.split(".").pop().toUpperCase()} file` : "Unknown file type");
const messageFor = (status, fallback) => ({ 404: "File not found. Check the file ID and try again.", 409: "This file is still processing. Please try again shortly.", 410: "This upload did not complete successfully." }[status] || (status >= 500 ? "The server could not complete that request. Please try again." : fallback || "Something went wrong. Please try again."));
async function sha256(file) { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function idFromResponse(payload) { return payload?.id || payload?.path?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || null; }
function filenameFromDisposition(header, fallback) { const m = header?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i); return decodeURIComponent(m?.[1] || m?.[2] || fallback); }
function Icon({ name, size = 18 }) {
  const items = { upload:<><path d="M12 16V4m0 0 4 4m-4-4L8 8"/><path d="M5 14v4h14v-4"/></>, file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>, check:<path d="m5 12 4.2 4L19 6.5"/>, copy:<><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4"/></>, sun:<><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>, moon:<path d="M20.3 15.2A8.8 8.8 0 0 1 8.8 3.7 8.8 8.8 0 1 0 20.3 15.2Z"/>, download:<><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19v2h14v-2"/></> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{items[name]}</svg>;
}
function App() {
  const inputRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("karna-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  const [file, setFile] = useState(null); const [dragging, setDragging] = useState(false); const [state, setState] = useState("idle"); const [progress, setProgress] = useState(0); const [error, setError] = useState(""); const [result, setResult] = useState(null); const [fileId, setFileId] = useState(""); const [retrieving, setRetrieving] = useState(false); const [retrieveError, setRetrieveError] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("karna-theme", theme); }, [theme]);
  const chooseFile = (candidate) => { if (!candidate) return; setFile(candidate); setState("ready"); setProgress(0); setError(""); setResult(null); setCopied(false); };
  const upload = async () => {
    if (!file) return setError("Choose a file before uploading.");
    if (!window.crypto?.subtle) return setError("This browser cannot securely verify files for upload.");
    setState("verifying"); setError(""); setProgress(0);
    try {
      const hash = await sha256(file); setState("uploading");
      const response = await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest(); request.open("POST", `${apiBase}/files/upload`);
        request.setRequestHeader("Idempotency-Key", crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`); request.setRequestHeader("expected-size", String(file.size)); request.setRequestHeader("expected-hash", hash);
        request.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
        request.onerror = () => reject({ status: 0 }); request.onload = () => { let body = {}; try { body = JSON.parse(request.responseText); } catch {} request.status >= 200 && request.status < 300 ? resolve(body) : reject({ status: request.status }); };
        const data = new FormData(); data.append("file", file, file.name); request.send(data);
      });
      const id = idFromResponse(response); setResult({ id, name: file.name, size: file.size }); setFileId(id || ""); setProgress(100); setState("complete");
    } catch (requestError) { setState("error"); setError(messageFor(requestError.status, "Something went wrong while uploading.")); }
  };
  const retrieve = async (id = fileId, fallbackName = "download") => {
    const trimmed = id.trim(); if (!trimmed) return setRetrieveError("Enter a file ID to retrieve a file.");
    setRetrieveError(""); setRetrieving(true);
    try { const response = await fetch(`${apiBase}/files/${encodeURIComponent(trimmed)}`); if (!response.ok) throw { status: response.status }; const link = document.createElement("a"); link.href = URL.createObjectURL(await response.blob()); link.download = filenameFromDisposition(response.headers.get("content-disposition"), fallbackName); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); }
    catch (requestError) { setRetrieveError(messageFor(requestError.status, "Unable to retrieve this file. Check your connection and try again.")); } finally { setRetrieving(false); }
  };
  const copyId = async () => { try { await navigator.clipboard.writeText(result.id); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setRetrieveError("Could not copy the file ID. Select and copy it manually."); } };
  const busy = state === "verifying" || state === "uploading";
  return <main className="app-shell"><div className="atmosphere" aria-hidden="true"/><header className="topbar"><a className="brand" href="/" aria-label="Karna home"><span className="logo-frame"><img src={karnaLogo} alt=""/></span><span>Karna</span></a><div className="nav-actions"><span className="security-label"><i/>Secure file transfer</span><button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"} size={16}/></button></div></header>
    <section className="hero" aria-labelledby="hero-title"><p className="eyebrow">Private file transfer</p><h1 id="hero-title">Send files with confidence.</h1><p>Securely upload, verify, and retrieve files with Karna.</p></section>
    <section className="workspace"><section className="transfer" aria-label="File upload"><div className="panel-label"><span>01</span> Upload a file</div>{!result ? <div className={`dropzone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`} role="button" tabIndex="0" aria-label="Choose a file to upload" onClick={(e) => { if (!file && !e.target.closest("button")) inputRef.current?.click(); }} onKeyDown={(e) => { if (!file && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click(); } }} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files?.[0]); }}><input ref={inputRef} className="sr-only" id="file-input" type="file" onChange={(e) => chooseFile(e.target.files?.[0])}/>
      {!file ? <div className="empty-state"><span className="transfer-icon"><Icon name="upload" size={23}/></span><p className="drop-title">Drop your file here</p><p className="drop-copy">or <button className="inline-button" type="button" onClick={() => inputRef.current?.click()}>choose a file</button> from your device</p><span className="quiet-note">One file at a time · Any file type</span></div> : <div className="selected-state"><span className="file-icon"><Icon name="file" size={25}/></span><div className="selected-file"><p>{file.name}</p><span>{readableType(file)} <b>·</b> {fileSize(file.size)}</span></div><button className="choose-another" type="button" onClick={() => inputRef.current?.click()}>Choose another</button></div>}
      {busy && <div className="transfer-status" aria-live="polite">{state === "verifying" ? <><span className="spinner"/><div><small>Preparing verification</small><strong>Verifying file integrity</strong></div></> : <><div className="status-top"><div><small>Uploading file</small><strong>{file.name}</strong></div><b>{progress}%</b></div><div className="progress-track"><div className="progress-bar" style={{width:`${progress}%`}}/></div><span>{fileSize(file.size * progress / 100)} of {fileSize(file.size)}</span></>}</div>}
      {error && <p className="notice error" role="alert">{error}</p>}{file && !busy && <button className="upload-action" type="button" onClick={upload}><Icon name="upload" size={16}/>Upload file</button>}</div> : <div className="success-panel" aria-live="polite"><div className="verified-seal"><Icon name="check" size={25}/></div><p className="eyebrow">Verified transfer</p><h2>Upload complete</h2><p className="success-file">{result.name} <span>·</span> {fileSize(result.size)}</p><p className="success-copy">Your file is verified and ready to retrieve.</p>{result.id ? <><button className="download-action" type="button" onClick={() => retrieve(result.id, result.name)} disabled={retrieving}><Icon name="download" size={17}/>{retrieving ? "Preparing download…" : "Download file"}</button><div className="id-row"><div><small>File ID</small><code>{result.id}</code></div><button className="copy-button" type="button" onClick={copyId}><Icon name={copied ? "check" : "copy"} size={16}/>{copied ? "Copied" : "Copy"}</button></div></> : <p className="notice error">Upload finished, but a retrievable file ID was not returned.</p>}</div>}</section>
    <section className="retrieve" aria-labelledby="retrieve-title"><div className="panel-label"><span>02</span> Retrieve a file</div><div className="retrieve-intro"><h2 id="retrieve-title">Have a Karna file ID?</h2><p>Paste it here to retrieve the original file.</p></div><div className="retrieve-form"><label className="sr-only" htmlFor="file-id">File ID</label><input id="file-id" value={fileId} onChange={(e) => setFileId(e.target.value)} placeholder="Paste file ID" autoComplete="off"/><button className="retrieve-action" type="button" onClick={() => retrieve()} disabled={retrieving}>{retrieving ? "Retrieving…" : "Retrieve"}<Icon name="download" size={15}/></button>{retrieveError && <p className="notice error" role="alert">{retrieveError}</p>}</div></section></section><footer><span/>Karna verifies every file before it is stored.<span/></footer></main>;
}
export default App;
