export interface QueueTicketDownloadData {
  queueNumber: string;
  bookingCode: string;
  patientName: string;
  poliName: string;
  doctorName: string;
  queueDate: string;
  status?: string;
  estimasi?: string | null;
}

/**
 * Menghasilkan file gambar PNG bukti antrean berkualitas tinggi secara client-side
 * Menggunakan HTML5 Canvas murni tanpa dependensi eksternal.
 */
export function downloadTicketImage(data: QueueTicketDownloadData): void {
  const width = 640;
  const height = 860;
  const scale = 2; // 2x scale for Retina crispness

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);

  // 1. Background Kanvas
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, width, height);

  // 2. Border Kartu Utama
  const margin = 24;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const radius = 16;

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(margin, margin, cardW, cardH, radius);
  ctx.stroke();

  // 3. Sentuhan Pixel Cross (+) di Sudut-sudut Kartu
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("+", margin - 5, margin + 4);
  ctx.fillText("+", width - margin - 5, margin + 4);
  ctx.fillText("+", margin - 5, height - margin + 4);
  ctx.fillText("+", width - margin - 5, height - margin + 4);

  // 4. Header Kartu & Logo Omnimedix
  const logoX = margin + 28;
  const logoY = margin + 32;
  
  // Icon box
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.roundRect(logoX, logoY, 32, 32, 8);
  ctx.fill();

  // Icon Plus (+)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", logoX + 16, logoY + 16);

  // Brand Name & Subtitle
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Omnimedix", logoX + 44, logoY + 18);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Clinic", logoX + 144, logoY + 18);

  ctx.fillStyle = "#64748b";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("BUKTI RESMI PENDAFTARAN ANTREAN RAWAT JALAN", logoX + 44, logoY + 34);

  // 5. Garis Pembatas Halus (Dashed line)
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(margin + 24, margin + 84);
  ctx.lineTo(width - margin - 24, margin + 84);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // 6. Box Nomor Antrean Utama
  const boxX = margin + 24;
  const boxY = margin + 104;
  const boxW = cardW - 48;
  const boxH = 130;

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 12);
  ctx.fill();

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 12);
  ctx.stroke();

  // Label Nomor Antrean
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("NOMOR ANTREAN ANDA", width / 2, boxY + 28);

  // Angka Nomor Antrean Besar
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 56px 'Courier New', monospace";
  ctx.fillText(data.queueNumber, width / 2, boxY + 84);

  // Sublabel Poli di bawah nomor
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.poliName, width / 2, boxY + 112);

  // 7. Box Kode Booking & Tanggal
  const codeBoxY = boxY + boxH + 16;
  const codeBoxH = 68;

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(boxX, codeBoxY, boxW, codeBoxH, 10);
  ctx.fill();

  ctx.strokeStyle = "#1e293b";
  ctx.beginPath();
  ctx.roundRect(boxX, codeBoxY, boxW, codeBoxH, 10);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("KODE BOOKING UNIK", boxX + 18, codeBoxY + 26);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillText(data.bookingCode, boxX + 18, codeBoxY + 52);

  ctx.textAlign = "right";
  ctx.fillStyle = "#64748b";
  ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("TANGGAL KUNJUNGAN", boxX + boxW - 18, codeBoxY + 26);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.queueDate, boxX + boxW - 18, codeBoxY + 50);

  // 8. Rincian Informasi Pasien & Layanan
  let detailY = codeBoxY + codeBoxH + 32;
  const drawRow = (label: string, value: string, highlight = false) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(label, boxX + 8, detailY);

    ctx.textAlign = "right";
    ctx.fillStyle = highlight ? "#38bdf8" : "#f1f5f9";
    ctx.font = highlight
      ? "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(value, boxX + boxW - 8, detailY);

    // Separator line
    ctx.strokeStyle = "#172033";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + 8, detailY + 12);
    ctx.lineTo(boxX + boxW - 8, detailY + 12);
    ctx.stroke();

    detailY += 34;
  };

  drawRow("Nama Pasien", data.patientName);
  drawRow("Dokter Spesialis", data.doctorName);
  drawRow("Estimasi Waktu", data.estimasi || "± 10-15 menit", true);
  drawRow("Status Antrean", (data.status === "in_progress" ? "Sedang Dilayani" : data.status === "completed" ? "Selesai" : "Menunggu"));

  // 9. Box Petunjuk Pasien
  const infoY = detailY + 16;
  const infoH = 68;

  ctx.fillStyle = "#0c1322";
  ctx.beginPath();
  ctx.roundRect(boxX, infoY, boxW, infoH, 8);
  ctx.fill();

  ctx.strokeStyle = "#1e293b";
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Petunjuk Kunjungan:", boxX + 16, infoY + 24);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("1. Hadir di ruang tunggu 15 menit sebelum estimasi waktu giliran.", boxX + 16, infoY + 42);
  ctx.fillText("2. Tunjukkan kode booking ini kepada perawat saat dipanggil.", boxX + 16, infoY + 58);

  // 10. Footer Monospace Barcode / Verification Tag
  const footY = height - margin - 22;
  ctx.textAlign = "center";
  ctx.fillStyle = "#475569";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText(`[ OMNIMEDIX // VERIFIED QUEUE PASS // ${data.bookingCode} ]`, width / 2, footY);

  // Trigger Download
  const link = document.createElement("a");
  link.download = `bukti-antrean-${data.queueNumber}-${data.bookingCode}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
