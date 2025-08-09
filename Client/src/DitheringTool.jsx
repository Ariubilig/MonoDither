import { useState, useRef, useEffect } from "react";
import {
  floydSteinberg,
  atkinson,
  orderedDither,
  jarvisJudiceNinke,
  stucki,
  burkes,
  sierra,
  sierraLite,
  nearest
} from "./dithering.js";

const algorithmsConfig = {
  "Nearest": {
    fn: nearest,
    descr: "No dithering. Each pixel maps to nearest palette color.",
  },
  "Floyd–Steinberg": {
    fn: floydSteinberg,
    descr: "Classic error diffusion. Sharp and detailed patterns.",
  },
  "Jarvis–Judice–Ninke": {
    fn: jarvisJudiceNinke,
    descr: "Smooth diffusion with larger kernel. Softer textures.",
  },
  "Stucki": {
    fn: stucki,
    descr: "Balanced diffusion similar to JJN. Clean gradients.",
  },
  "Burkes": {
    fn: burkes,
    descr: "Lightweight diffusion. Faster with good quality.",
  },
  "Sierra": {
    fn: sierra,
    descr: "Three-row Sierra diffusion. Fine grain.",
  },
  "Sierra Lite": {
    fn: sierraLite,
    descr: "Simplified Sierra. Subtle dithering.",
  },
  "Atkinson": {
    fn: atkinson,
    descr: "Vintage Macintosh style. Airy, soft dot patterns.",
  },
  "Ordered": {
    fn: (data, w, h, palette, opts) => orderedDither(data, w, h, palette, opts?.matrixSize ?? 4),
    requiresMatrix: true,
    descr: "Bayer matrix thresholding. Very regular pattern.",
  },
};

const defaultPalettes = {
  "Black & White": [[0, 0, 0], [255, 255, 255]],
  "Grayscale 4": [[0, 0, 0], [85, 85, 85], [170, 170, 170], [255, 255, 255]],
  "Grayscale 8": [[0,0,0],[36,36,36],[73,73,73],[109,109,109],[146,146,146],[182,182,182],[219,219,219],[255,255,255]],
  "Grayscale 16": [[0,0,0],[17,17,17],[34,34,34],[51,51,51],[68,68,68],[85,85,85],[102,102,102],[119,119,119],[136,136,136],[153,153,153],[170,170,170],[187,187,187],[204,204,204],[221,221,221],[238,238,238],[255,255,255]],
  "Game Boy": [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  "C64": [[0, 0, 0], [255, 255, 255], [104, 55, 43], [112, 164, 178]],
  "CGA 4": [[0,0,0],[170,170,170],[0,170,170],[170,0,170]],
  "PICO-8": [[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170]],
  "DawnBringer 16": [[20,12,28],[68,36,52],[48,52,109],[78,74,78],[133,76,48],[52,101,36],[208,70,72],[117,113,97],[89,125,206],[210,125,44],[133,149,161],[109,170,44],[210,170,153],[109,194,202],[218,212,94],[222,238,214]]
};
const algorithmNames = Object.keys(algorithmsConfig);

function DitheringTool() {
  const [image, setImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [paletteName, setPaletteName] = useState("Black & White");
  const [customPalette, setCustomPalette] = useState([]);
  const [algorithm, setAlgorithm] = useState("Floyd–Steinberg");
  const [matrixSize, setMatrixSize] = useState(4);

  const originalRef = useRef(null);
  const ditherRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (image) processImage();
  }, [image, paletteName, customPalette, algorithm, matrixSize]);

  function loadFile(file) {
    if (!file || !file.type?.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = URL.createObjectURL(file);
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    loadFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    loadFile(file);
  }

  function getActivePalette() {
    if (paletteName === "Custom") return customPalette.length ? customPalette : [[0,0,0],[255,255,255]];
    return defaultPalettes[paletteName];
  }

  function processImage() {
    const originalCanvas = originalRef.current;
    const ditherCanvas = ditherRef.current;
    const ctxO = originalCanvas.getContext("2d");
    const ctxD = ditherCanvas.getContext("2d");

    originalCanvas.width = image.width;
    originalCanvas.height = image.height;
    ditherCanvas.width = image.width;
    ditherCanvas.height = image.height;

    ctxO.drawImage(image, 0, 0);
    ctxD.drawImage(image, 0, 0);

    let imgData = ctxD.getImageData(0, 0, ditherCanvas.width, ditherCanvas.height);
    const palette = getActivePalette();
    const cfg = algorithmsConfig[algorithm];
    if (cfg && typeof cfg.fn === 'function') {
      cfg.fn(imgData.data, ditherCanvas.width, ditherCanvas.height, palette, { matrixSize });
    }

    ctxD.putImageData(imgData, 0, 0);
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.download = "dithered.png";
    link.href = ditherRef.current.toDataURL();
    link.click();
  }

  function addCustomColor() {
    setCustomPalette([...customPalette, [0, 0, 0]]);
  }

  function updateCustomColor(index, rgb) {
    const updated = [...customPalette];
    updated[index] = rgb;
    setCustomPalette(updated);
  }

  return (
    <>
      <div className="app">
      <div className="sidebar">
        <h1 className="title">Tools</h1>

        <select
          value={paletteName}
          onChange={(e) => setPaletteName(e.target.value)}
          className="select"
        >
          {Object.keys(defaultPalettes).map((p) => (
            <option key={p}>{p}</option> 
          ))}
          <option>Custom</option>
        </select>

        {paletteName === "Custom" && (
          <div className="palette-editor">
            {customPalette.map((c, i) => (
              <input
                key={i}
                type="color"
                className="color-swatch"
                value={`#${c.map(x => x.toString(16).padStart(2,"0")).join("")}`}
                onChange={(e) => {
                  const hex = e.target.value.match(/[A-Fa-f0-9]{2}/g).map(v => parseInt(v, 16));
                  updateCustomColor(i, hex);
                }}
              />
            ))}
            <button className="btn ghost" onClick={addCustomColor}>+ Add Color</button>
          </div>
        )}

        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          className="select"
        >
          {algorithmNames.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>

        <p className="hint">{algorithmsConfig[algorithm]?.descr}</p>

        {algorithmsConfig[algorithm]?.requiresMatrix && (
          <input
            type="number"
            min="2"
            max="8"
            value={matrixSize}
            onChange={(e) => setMatrixSize(parseInt(e.target.value))}
            className="number"
          />
        )}

        <div className="download-wrap">
          <button onClick={handleDownload} className="btn">
            Download
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="preview">
        {image ? (
          <>
            <div className="tile">
              <h2>Original</h2>
              <div className="canvas-wrap">
                <canvas ref={originalRef} className="canvas-preview" />
              </div>
            </div>
            <div className="tile">
              <h2>Dithered</h2>
              <div className="canvas-wrap">
                <canvas ref={ditherRef} className="canvas-preview" />
              </div>
            </div>
          </>
        ) : (
          <div
            className={`dropzone ${isDragging ? "dragging" : ""}`}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload or drop an image"
          >
            <p className="hint">Drag & drop image here, or click to upload</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              aria-hidden="true"
              className="hidden-input"
            />
          </div>
        )}
      </div>
      </div>
    </>
  );
}

export default DitheringTool