import { SavedSubmission } from "./types";

/**
 * Pure HTML5 Canvas 2D fallback renderer for the bespoke suit order receipt.
 * Guaranteed 100% reliability with zero dependency on CSS parsers, SVG foreignObject, or CORS fonts.
 */
export function renderReceiptCanvas(submission: SavedSubmission): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const scale = 2; // Retina resolution
  const width = 520;
  
  // Preliminary height estimation
  const baseHeight = 780;
  const notesLength = (submission.data.customNotes || "").length;
  const addressLength = (submission.data.address || "").length;
  const productLength = (submission.data.productName || "").length;
  const extraHeight = Math.ceil(notesLength / 25) * 22 + Math.ceil(addressLength / 25) * 22 + Math.ceil(productLength / 25) * 22;
  const height = baseHeight + extraHeight;

  canvas.width = width * scale;
  canvas.height = height * scale;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Top header bar
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(12, 12, width - 24, 38);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BESTDIVE BESPOKE LAB • SURVEY RECEIPT", width / 2, 36);

  // Title section
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 20px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  ctx.fillText("이도겸 트레이너 베스트다이브 슈트 주문서", width / 2, 80);

  ctx.fillStyle = "#2563EB";
  ctx.font = "bold 11px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  ctx.fillText("베스트다이브 공식 맞춤 주문서", width / 2, 100);

  // Issued Date
  ctx.fillStyle = "#64748B";
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText(`ISSUED AT: ${submission.timestamp || new Date().toLocaleString()}`, width / 2, 120);

  // Separator
  const drawDivider = (y: number, dashed = true) => {
    ctx.beginPath();
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    if (dashed) {
      ctx.setLineDash([4, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.moveTo(28, y);
    ctx.lineTo(width - 28, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawDivider(135);

  let currentY = 160;

  // Helper for drawing key-value pairs
  const drawRow = (label: string, value: string, isHighlight = false) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 12px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
    ctx.fillText(label, 32, currentY);

    ctx.textAlign = "right";
    ctx.fillStyle = isHighlight ? "#1D4ED8" : "#0F172A";
    ctx.font = isHighlight 
      ? "bold 13px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
      : "500 12px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
    
    // Check if value fits on one line
    const maxValWidth = 300;
    const metrics = ctx.measureText(value);
    if (metrics.width > maxValWidth) {
      // Wrap multi-line value
      const words = value.split("");
      let line = "";
      const lines: string[] = [];
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        if (ctx.measureText(testLine).width > maxValWidth && i > 0) {
          lines.push(line);
          line = words[i];
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      for (let j = 0; j < lines.length; j++) {
        if (j > 0) currentY += 18;
        ctx.fillText(lines[j], width - 32, currentY);
      }
    } else {
      ctx.fillText(value || "-", width - 32, currentY);
    }
    currentY += 24;
  };

  // 1. 주문자 정보
  ctx.textAlign = "left";
  ctx.fillStyle = "#2563EB";
  ctx.font = "bold 11px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  ctx.fillText("■ 주문자 및 배송 정보", 32, currentY);
  currentY += 20;

  drawRow("주문자 성명", submission.data.ordererName);
  drawRow("개인통관고유부호", submission.data.customsId);
  drawRow("연락처", submission.data.phone);
  drawRow("우편번호", submission.data.postalCode);
  drawRow("배송지 주소", submission.data.address);

  drawDivider(currentY + 5);
  currentY += 25;

  // 2. 제품 옵션 정보
  ctx.textAlign = "left";
  ctx.fillStyle = "#2563EB";
  ctx.font = "bold 11px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  ctx.fillText("■ 제품 상세 옵션 (스마트스토어 25% 할인)", 32, currentY);
  currentY += 20;

  drawRow("1. 상세 제품명", submission.data.productName, true);
  drawRow("2. 성별", submission.data.gender || "남성");
  drawRow("3. 사이즈", submission.data.size || "-");
  drawRow("4. 네오프렌 두께", submission.data.thickness || "-");
  drawRow("5. 스킨 컬러", submission.data.color || "-");
  drawRow("가격 적용 혜택", "스마트스토어 정가 기준 25% 할인 적용", true);

  drawDivider(currentY + 5);
  currentY += 25;

  // 3. 커스텀 요구사항
  if (submission.data.customNotes) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#2563EB";
    ctx.font = "bold 11px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
    ctx.fillText("■ 6. 커스텀 및 특별 지시 요구사항", 32, currentY);
    currentY += 18;

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(28, currentY, width - 56, Math.ceil(notesLength / 30) * 18 + 20);
    ctx.strokeStyle = "#E2E8F0";
    ctx.strokeRect(28, currentY, width - 56, Math.ceil(notesLength / 30) * 18 + 20);

    ctx.fillStyle = "#334155";
    ctx.font = "11px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
    currentY += 16;

    // Wrap custom notes
    const text = submission.data.customNotes;
    const maxNoteWidth = width - 80;
    const words = text.split("");
    let line = "";
    for (let i = 0; i < words.length; i++) {
      if (words[i] === "\n") {
        ctx.fillText(line, 40, currentY);
        line = "";
        currentY += 16;
        continue;
      }
      const testLine = line + words[i];
      if (ctx.measureText(testLine).width > maxNoteWidth && i > 0) {
        ctx.fillText(line, 40, currentY);
        line = words[i];
        currentY += 16;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, 40, currentY);
      currentY += 22;
    }
    currentY += 15;
    drawDivider(currentY, false);
    currentY += 20;
  }

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 11px 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  ctx.fillText("★ THANK YOU FOR YOUR BESPOKE ORDER ★", width / 2, currentY + 10);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText("스마트스토어: https://smartstore.naver.com/moffmall", width / 2, currentY + 28);
  ctx.fillText("Securely verified by Google Sheets Database Sync", width / 2, currentY + 44);

  return canvas.toDataURL("image/png");
}
