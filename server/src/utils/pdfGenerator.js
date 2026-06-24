import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate a professional A4 invoice PDF buffer using PDFKit.
 * @param {Object} invoice SubscriptionInvoice document details
 * @param {Object} institute Institute details (billing contact etc.)
 * @returns {Promise<Buffer>} PDF file buffer
 */
export const generateInvoicePdfBuffer = (invoice, institute) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // --- BRAND COLORS & STYLES ---
      const primaryColor = '#4f46e5'; // Premium indigo
      const textColor = '#1f2937'; // Dark charcoal
      const lightGray = '#f3f4f6'; // Background grids
      const accentGray = '#9ca3af';

      // --- LOGO & HEADER ---
      const logoPath = path.join(path.resolve(), 'src', 'assets', 'trineoStream-1.png');
      let logoDrawn = false;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 40, 40, { width: 45 });
          logoDrawn = true;
        } catch (e) {
          console.error('[PDF Gen] Failed to draw logo image:', e);
        }
      }

      // Title Text
      const textX = logoDrawn ? 95 : 40;
      doc.fillColor(primaryColor)
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('Trineo Stream', textX, 42);

      doc.fillColor(textColor)
         .fontSize(10)
         .font('Helvetica')
         .text('Next-Gen Streaming LMS Portal', textX, 65);

      // Invoice / Date info (Right-aligned header block)
      doc.font('Helvetica-Bold')
         .fontSize(18)
         .fillColor(textColor)
         .text('INVOICE', 400, 40, { align: 'right', width: 155 });

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(textColor)
         .text(`No: ${invoice.invoiceNumber}`, 400, 60, { align: 'right', width: 155 });

      const dateOpts = { year: 'numeric', month: 'short', day: 'numeric' };
      const issueDateFormatted = new Date(invoice.issueDate || Date.now()).toLocaleDateString('en-US', dateOpts);
      const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString('en-US', dateOpts);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(accentGray)
         .text(`Issued: ${issueDateFormatted}`, 400, 75, { align: 'right', width: 155 })
         .text(`Due: ${dueDateFormatted}`, 400, 88, { align: 'right', width: 155 });

      // Divider Line
      doc.moveTo(40, 115)
         .lineTo(555, 115)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();

      // --- BILLING SECTIONS (TWO-COLUMN) ---
      const colWidth = 240;
      const colY = 130;

      // Bill From (Trineo support info)
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(primaryColor)
         .text('BILL FROM:', 40, colY)
         .font('Helvetica-Bold')
         .fillColor(textColor)
         .text('Trineo Support Team', 40, colY + 15)
         .font('Helvetica')
         .fillColor(textColor)
         .text('Email: support@trineo.in', 40, colY + 28)
         .text('Phone: +91 81389 76541', 40, colY + 40)
         .text('Payment: manual/UPI processing', 40, colY + 52);

      // Bill To (Institute billing contact info)
      const bContactName = institute.billingContactName || institute.contactPerson || 'Admin User';
      const bContactEmail = institute.billingContactEmail || institute.email || 'billing@trineo.in';
      const bContactPhone = institute.billingContactPhone || institute.phone || 'N/A';

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(primaryColor)
         .text('BILL TO:', 310, colY)
         .font('Helvetica-Bold')
         .fillColor(textColor)
         .text(invoice.instituteName, 310, colY + 15)
         .font('Helvetica')
         .fillColor(textColor)
         .text(`Code: ${invoice.instituteCode}`, 310, colY + 28)
         .text(`Billing Contact: ${bContactName}`, 310, colY + 40)
         .text(`Email: ${bContactEmail}`, 310, colY + 52)
         .text(`Phone: ${bContactPhone}`, 310, colY + 64);

      // Divider Line
      doc.moveTo(40, 215)
         .lineTo(555, 215)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();

      // --- TABLE SECTION ---
      const tableY = 235;

      // Header row background
      doc.rect(40, tableY, 515, 22)
         .fill(lightGray);

      doc.fillColor(textColor)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Description', 50, tableY + 6, { width: 200 })
         .text('Cycle', 260, tableY + 6, { width: 70 })
         .text('Base Amount', 340, tableY + 6, { width: 70, align: 'right' })
         .text('Tax', 420, tableY + 6, { width: 50, align: 'right' })
         .text('Total', 480, tableY + 6, { width: 65, align: 'right' });

      // Table row content (Invoice details)
      const rowY = tableY + 30;
      doc.font('Helvetica')
         .fontSize(9)
         .text(`SaaS Subscription Plan - ${invoice.planNameSnapshot}`, 50, rowY, { width: 200 })
         .text(invoice.billingCycleSnapshot.toUpperCase(), 260, rowY, { width: 70 })
         .text(`$${invoice.amountSnapshot.toFixed(2)}`, 340, rowY, { width: 70, align: 'right' })
         .text(`$${invoice.taxAmountSnapshot.toFixed(2)}`, 420, rowY, { width: 50, align: 'right' })
         .text(`$${invoice.totalAmountSnapshot.toFixed(2)}`, 480, rowY, { width: 65, align: 'right' });

      // Divider below row
      doc.moveTo(40, rowY + 18)
         .lineTo(555, rowY + 18)
         .strokeColor('#f3f4f6')
         .lineWidth(1)
         .stroke();

      // --- SUMMARY & TOTAL BLOCK ---
      const summaryY = rowY + 35;

      // Draw status badge
      let statusColor = '#f59e0b'; // pending -> orange
      if (invoice.status === 'paid') statusColor = '#10b981'; // green
      if (invoice.status === 'overdue') statusColor = '#ef4444'; // red

      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(textColor)
         .text('Payment Status: ', 40, summaryY);

      // Badge pill
      doc.rect(125, summaryY - 3, 60, 16)
         .fill(statusColor);

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text(invoice.status.toUpperCase(), 125, summaryY + 1, { width: 60, align: 'center' });

      // Total details on the right
      doc.fillColor(textColor)
         .font('Helvetica')
         .fontSize(9)
         .text('Subtotal:', 360, summaryY, { width: 110, align: 'right' })
         .text(`$${invoice.amountSnapshot.toFixed(2)}`, 480, summaryY, { width: 65, align: 'right' });

      doc.text('Tax (VAT/GST):', 360, summaryY + 15, { width: 110, align: 'right' })
         .text(`$${invoice.taxAmountSnapshot.toFixed(2)}`, 480, summaryY + 15, { width: 65, align: 'right' });

      // Total payable box
      doc.rect(340, summaryY + 32, 215, 26)
         .fill(primaryColor);

      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('Total Payable:', 350, summaryY + 40, { width: 110 })
         .text(`$${invoice.totalAmountSnapshot.toFixed(2)}`, 470, summaryY + 40, { width: 75, align: 'right' });

      // --- FOOTER & MANUAL INSTRUCTIONS & QR ---
      const footerY = 460;

      // Divider above footer
      doc.moveTo(40, footerY - 15)
         .lineTo(555, footerY - 15)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();

      // QR Code Placeholder
      doc.rect(40, footerY, 70, 70)
         .dash(4, { space: 2 })
         .strokeColor(accentGray)
         .stroke();

      doc.fillColor(accentGray)
         .font('Helvetica')
         .fontSize(7)
         .text('QR Placeholder\n(Future UPI)', 45, footerY + 28, { width: 60, align: 'center' });

      // Payment Instructions
      doc.font('Helvetica-Bold')
         .fontSize(9)
         .fillColor(textColor)
         .text('Payment Instructions', 130, footerY)
         .font('Helvetica')
         .fontSize(8)
         .fillColor(textColor)
         .text('1. Payments are collected manually via cash, bank transfer, or UPI.', 130, footerY + 15)
         .text('2. Bank: Trineo Bank | A/C: 9876543210 | IFSC: TRIN0000001', 130, footerY + 27)
         .text('3. Send the transactional reference number to support@trineo.in.', 130, footerY + 39)
         .text('4. Account manager will mark it paid and reactivate dashboard access.', 130, footerY + 51);

      // Support Notice & Warning
      doc.font('Helvetica-Oblique')
         .fontSize(7.5)
         .fillColor(accentGray)
         .text('Note: This is a system generated document. For support or dispute requests, please open a ticket on stream.trineo.in/support or call Trineo billing department.', 40, 560, { width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
