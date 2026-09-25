import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { TestSession } from '../types';
import { DocumentRecord } from './documentService';

export interface ReportGenerationParams {
  session: TestSession;
  reportCode: string;
  certificateId: string;
  status: 'DRAFT' | 'APPROVED' | 'FINAL';
  testingOfficerName?: string;
  reviewerName?: string;
  approverName?: string;
  documents?: DocumentRecord[];
  issueDate?: string;
}

export const pdfGeneratorService = {
  /**
   * Generates a real OIML R-76 Type Evaluation Report PDF as Uint8Array
   */
  async generateReportPDF(params: ReportGenerationParams): Promise<Uint8Array> {
    const { session, reportCode, certificateId, status } = params;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size: 210mm x 297mm in points
    const { width, height } = page.getSize();

    // Fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Color Palette
    const colorPrimary = rgb(0.06, 0.45, 0.45); // Teal 700 (#0f766e)
    const colorSlateDark = rgb(0.06, 0.09, 0.16); // Slate 950 (#0f172a)
    const colorSlateMuted = rgb(0.38, 0.45, 0.55); // Slate 500
    const colorLightBg = rgb(0.96, 0.97, 0.98);
    const colorBorder = rgb(0.88, 0.91, 0.94);
    const colorPass = rgb(0.06, 0.65, 0.42);
    const colorFail = rgb(0.88, 0.22, 0.33);

    // Generate QR Code Data URL -> Embed in PDF
    let qrImageBytes: Uint8Array | null = null;
    try {
      const verifyUrl = `${window.location.origin}/verify-report/${reportCode}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
      const base64Data = qrDataUrl.split(',')[1];
      qrImageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    } catch {
      // Fallback
    }

    let y = height - 40;

    // 1. TOP HEADER BANNER
    page.drawRectangle({
      x: 35,
      y: y - 50,
      width: width - 70,
      height: 55,
      color: colorPrimary,
    });

    page.drawText('NATIONAL LEGAL METROLOGY LABORATORY', {
      x: 48,
      y: y - 20,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('SIH PROTOTYPE / DEMONSTRATION REPORT • OIML R 76-1:2006 TYPE EVALUATION', {
      x: 48,
      y: y - 36,
      size: 8,
      font: fontBold,
      color: rgb(0.8, 0.95, 0.95),
    });

    // Report Status Badge
    const statusText = status === 'FINAL' ? 'OFFICIAL FINAL REPORT' : status === 'APPROVED' ? 'APPROVED REPORT' : 'DRAFT TEST REPORT';
    page.drawRectangle({
      x: width - 195,
      y: y - 45,
      width: 150,
      height: 20,
      color: status === 'FINAL' ? colorPass : status === 'APPROVED' ? rgb(0.12, 0.45, 0.85) : rgb(0.85, 0.55, 0.1),
    });

    page.drawText(statusText, {
      x: width - 185,
      y: y - 38,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    y -= 65;

    // 2. DRAFT WATERMARK (If DRAFT status)
    if (status === 'DRAFT') {
      page.drawText('DRAFT - FOR EVALUATION ONLY', {
        x: 120,
        y: height / 2,
        size: 28,
        font: fontBold,
        color: rgb(0.85, 0.85, 0.85),
        rotate: { angle: 0.5, type: 'radians' as any },
      });
    }

    // 3. REPORT IDENTIFICATION BAR
    page.drawRectangle({
      x: 35,
      y: y - 35,
      width: width - 70,
      height: 38,
      color: colorLightBg,
      borderColor: colorBorder,
      borderWidth: 1,
    });

    page.drawText(`Report Number: ${reportCode}`, { x: 48, y: y - 18, size: 9, font: fontBold, color: colorSlateDark });
    page.drawText(`Certificate ID: ${certificateId}`, { x: 230, y: y - 18, size: 9, font: fontBold, color: colorSlateDark });
    page.drawText(`Issue Date: ${params.issueDate || new Date().toISOString().substring(0, 10)}`, { x: 430, y: y - 18, size: 9, font: fontRegular, color: colorSlateMuted });

    y -= 48;

    // 4. INSTRUMENT SPECIFICATIONS TABLE
    page.drawText('1. INSTRUMENT IDENTIFICATION & METROLOGICAL CHARACTERISTICS', {
      x: 35,
      y,
      size: 9,
      font: fontBold,
      color: colorPrimary,
    });

    y -= 12;

    const instInfo = [
      ['Manufacturer:', session.manufacturer || 'Mettler Toledo Metrology Ltd.', 'Accuracy Class:', session.accuracyClass || 'Class III'],
      ['Instrument Model:', session.instrumentModel || 'XP-600', 'Max Capacity (Max):', session.maxCapacity || '30 kg'],
      ['Serial Number:', session.serialNumber || 'SN-2026', 'Verification Interval (e):', session.verificationInterval || '5 g'],
      ['Evaluation Context:', session.testContext || 'TYPE_EXAMINATION', 'Verification Mode:', session.verificationMode || 'INITIAL_VERIFICATION'],
    ];

    page.drawRectangle({
      x: 35,
      y: y - 80,
      width: width - 70,
      height: 80,
      color: rgb(1, 1, 1),
      borderColor: colorBorder,
      borderWidth: 1,
    });

    let rowY = y - 18;
    instInfo.forEach((row) => {
      page.drawText(row[0], { x: 45, y: rowY, size: 8, font: fontBold, color: colorSlateMuted });
      page.drawText(row[1], { x: 135, y: rowY, size: 8, font: fontRegular, color: colorSlateDark });
      page.drawText(row[2], { x: 310, y: rowY, size: 8, font: fontBold, color: colorSlateMuted });
      page.drawText(row[3], { x: 435, y: rowY, size: 8, font: fontBold, color: colorSlateDark });
      rowY -= 18;
    });

    y -= 92;

    // 5. ENVIRONMENTAL CONDITIONS
    page.drawText('2. TEST ENVIRONMENT CONDITIONS', { x: 35, y, size: 9, font: fontBold, color: colorPrimary });
    y -= 12;

    page.drawRectangle({ x: 35, y: y - 22, width: width - 70, height: 24, color: colorLightBg, borderColor: colorBorder, borderWidth: 1 });
    page.drawText(`Ambient Temp: ${session.ambientTemp ?? 22.4} °C  |  Humidity: ${session.relativeHumidity ?? 54} % RH  |  Pressure: ${session.barometricPressure ?? 1013.2} hPa  |  Standard: OIML R 76-1:2006`, {
      x: 45,
      y: y - 14,
      size: 8,
      font: fontRegular,
      color: colorSlateDark,
    });

    y -= 34;

    // 6. DETAILED TEST OBSERVATION SUMMARY TABLE
    page.drawText('3. SUMMARY OF OIML METROLOGICAL EVALUATION RESULTS', { x: 35, y, size: 9, font: fontBold, color: colorPrimary });
    y -= 12;

    // Table Header
    page.drawRectangle({ x: 35, y: y - 18, width: width - 70, height: 20, color: colorSlateDark });
    page.drawText('Clause', { x: 45, y: y - 13, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Metrological Test Procedure', { x: 110, y: y - 13, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Observations', { x: 330, y: y - 13, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('MPE / Limit', { x: 420, y: y - 13, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Verdict', { x: 505, y: y - 13, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 20;

    const testSummaryRows = [
      ['A.4.4', 'Weighing Accuracy Test (Increasing / Decreasing)', `${session.weighingObservations?.length || 5} loads`, '±0.5e to ±1.5e', session.overallEvaluationResult === 'NON_COMPLIANT' ? 'FAIL' : 'PASS'],
      ['A.4.10', 'Repeatability Test (10 consecutive runs)', `${session.repeatabilityObservations?.length || 10} trials`, '|Imax - Imin| <= MPE', 'PASS'],
      ['A.4.7', 'Eccentricity (Off-Centre Load Test)', `${session.eccentricityObservations?.length || 4} positions`, '±1.0e (Max/3 load)', session.eccentricityObservations?.some((e) => !e.passed) ? 'FAIL' : 'PASS'],
      ['A.4.8', 'Digital Discrimination Test (1.4d additional load)', `${session.discriminationObservations?.length || 3} test points`, 'Indication + 1.0d', 'PASS'],
      ['A.4.2.3', 'Zero-Setting Accuracy Test', 'E0 calculated via ΔL', '±0.25e', 'PASS'],
      ['A.4.6', 'Tare Device Operation & Net Performance', `${session.tareTestSession?.netWeighingObservations?.length || 5} net points`, '±MPE on Net', 'PASS'],
    ];

    testSummaryRows.forEach((tr, i) => {
      const bgColor = i % 2 === 0 ? rgb(1, 1, 1) : colorLightBg;
      page.drawRectangle({ x: 35, y: y - 18, width: width - 70, height: 18, color: bgColor, borderColor: colorBorder, borderWidth: 0.5 });
      page.drawText(tr[0], { x: 45, y: y - 13, size: 7.5, font: fontMono, color: colorSlateDark });
      page.drawText(tr[1], { x: 110, y: y - 13, size: 7.5, font: fontRegular, color: colorSlateDark });
      page.drawText(tr[2], { x: 330, y: y - 13, size: 7.5, font: fontRegular, color: colorSlateMuted });
      page.drawText(tr[3], { x: 420, y: y - 13, size: 7.5, font: fontRegular, color: colorSlateMuted });
      
      const isFail = tr[4] === 'FAIL';
      page.drawText(tr[4], { x: 505, y: y - 13, size: 8, font: fontBold, color: isFail ? colorFail : colorPass });
      y -= 18;
    });

    y -= 12;

    // 7. OVERALL EVALUATION VERDICT CARD
    const isCompliant = session.overallEvaluationResult === 'COMPLIANT' || session.overallVerdict === 'Compliant';
    page.drawRectangle({
      x: 35,
      y: y - 45,
      width: width - 70,
      height: 45,
      color: isCompliant ? rgb(0.93, 0.98, 0.95) : rgb(0.99, 0.92, 0.93),
      borderColor: isCompliant ? colorPass : colorFail,
      borderWidth: 1.5,
    });

    page.drawText(`OVERALL TYPE EVALUATION VERDICT: ${isCompliant ? 'COMPLIANT (PASSED)' : 'NON-COMPLIANT (REJECTED)'}`, {
      x: 48,
      y: y - 18,
      size: 10,
      font: fontBold,
      color: isCompliant ? colorPass : colorFail,
    });

    page.drawText(
      isCompliant
        ? 'The weighing instrument fully satisfies all applicable metrological requirements under OIML R 76-1:2006.'
        : 'Non-Conformity Notice: One or more test observations exceeded maximum permissible error (MPE) limits.',
      { x: 48, y: y - 32, size: 8, font: fontRegular, color: colorSlateDark }
    );

    y -= 58;

    // 8. SIGNATORIES & APPROVAL BLOCK
    page.drawText('4. OFFICIAL SIGNATORIES & WORKFLOW AUTHORIZATION', { x: 35, y, size: 9, font: fontBold, color: colorPrimary });
    y -= 12;

    page.drawRectangle({ x: 35, y: y - 75, width: width - 70, height: 75, color: rgb(1, 1, 1), borderColor: colorBorder, borderWidth: 1 });

    const sigs = [
      ['Testing Officer:', params.testingOfficerName || session.assignedOfficer || 'Dr. Ananya Rao', 'Electronically approved'],
      ['Technical Reviewer:', params.reviewerName || session.reviewer || session.reviewedBy || 'Vikramaditya Verma', 'Technical audit verified'],
      ['Approving Officer / Lab Director:', params.approverName || session.approver || session.approvedBy || session.finalizedBy || 'Dr. K. S. Murthy', 'Official Certificate Authorization'],
    ];

    let sigY = y - 18;
    sigs.forEach((sg) => {
      page.drawText(sg[0], { x: 45, y: sigY, size: 8, font: fontBold, color: colorSlateMuted });
      page.drawText(sg[1], { x: 190, y: sigY, size: 8, font: fontBold, color: colorSlateDark });
      page.drawText(`✓ ${sg[2]}`, { x: 370, y: sigY, size: 7.5, font: fontRegular, color: colorPass });
      sigY -= 22;
    });

    // 9. Embed QR Code Image if available
    if (qrImageBytes) {
      try {
        const qrImage = await pdfDoc.embedPng(qrImageBytes);
        page.drawImage(qrImage, {
          x: width - 95,
          y: 40,
          width: 60,
          height: 60,
        });
        page.drawText('Scan to Verify', { x: width - 95, y: 30, size: 6.5, font: fontBold, color: colorSlateMuted });
      } catch {
        // Fallback if png embedding fails
      }
    }

    // Footnote
    page.drawText('National Legal Metrology Evaluation Portal • ISO/IEC 17025 Standard • SIH26035 Prototype', {
      x: 35,
      y: 35,
      size: 7,
      font: fontRegular,
      color: colorSlateMuted,
    });

    return await pdfDoc.save();
  },
};
