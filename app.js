(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file");
  const previewWrap = document.getElementById("previewWrap");
  const preview = document.getElementById("preview");
  const convertBtn = document.getElementById("convert");
  const clearBtn = document.getElementById("clear");
  const statusEl = document.getElementById("status");

  /** @type {string | null} */
  let dataUrl = null;

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", !!isError);
  }

  function getJsPDF() {
    const w = typeof window !== "undefined" ? window : {};
    if (w.jspdf && typeof w.jspdf.jsPDF === "function") return w.jspdf.jsPDF;
    if (typeof w.jsPDF === "function") return w.jsPDF;
    return null;
  }

  function reset() {
    dataUrl = null;
    preview.removeAttribute("src");
    previewWrap.classList.add("hidden");
    convertBtn.disabled = true;
    clearBtn.disabled = true;
    fileInput.value = "";
    setStatus("");
  }

  /**
   * @param {File} file
   */
  function loadFile(file) {
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setStatus("Could not read that file.", true);
        return;
      }
      dataUrl = result;
      preview.src = result;
      previewWrap.classList.remove("hidden");
      convertBtn.disabled = false;
      clearBtn.disabled = false;
      setStatus('Ready. Click "Download PDF" to save.');
    };
    reader.onerror = () => setStatus("Could not read that file.", true);
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener("click", (e) => {
    if (e.target === fileInput) return;
  });

  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) loadFile(f);
  });

  ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  dropzone.addEventListener("dragenter", () => dropzone.classList.add("dragover"));
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("dragover", () => dropzone.classList.add("dragover"));
  dropzone.addEventListener("drop", (e) => {
    dropzone.classList.remove("dragover");
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  clearBtn.addEventListener("click", reset);

  convertBtn.addEventListener("click", () => {
    if (!dataUrl) return;

    const jsPDF = getJsPDF();
    if (!jsPDF) {
      setStatus(
        "PDF library not loaded. Ensure jspdf.umd.min.js is next to index.html and refresh.",
        true
      );
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setStatus("Could not process this image.", true);
        return;
      }
      ctx.drawImage(img, 0, 0);
      let embedUrl;
      try {
        embedUrl = canvas.toDataURL("image/png");
      } catch (err) {
        setStatus("Could not export this image (e.g. tainted canvas).", true);
        console.error(err);
        return;
      }

      const pdf = new jsPDF({
        orientation: img.naturalHeight >= img.naturalWidth ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const pxToMm = 25.4 / 96;
      const imgWmm = img.naturalWidth * pxToMm;
      const imgHmm = img.naturalHeight * pxToMm;
      const scale = Math.min(pageW / imgWmm, pageH / imgHmm, 1);
      const w = imgWmm * scale;
      const h = imgHmm * scale;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      try {
        pdf.addImage(embedUrl, "PNG", x, y, w, h);
        pdf.save("image.pdf");
        setStatus("PDF downloaded.");
      } catch (err) {
        setStatus("Could not create PDF from this image.", true);
        console.error(err);
      }
    };
    img.onerror = () => setStatus("Could not load the image for PDF.", true);
    img.src = dataUrl;
  });
})();
