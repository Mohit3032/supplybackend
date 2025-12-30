const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

async function generateInvoiceAndSendEmail(booking) {
  const { type, delegates = [], sponsorship, subtotal, discount, tax, total, currency } = booking;

  let primary;
  let recipients = [];

  if (type === "pass") {
    if (!delegates.length) throw new Error("No delegates found for pass booking");
    primary = delegates[0];
    recipients = delegates.map((d) => ({ name: d.firstName, email: d.email }));
  } else if (type === "sponsorship") {
    if (!sponsorship) throw new Error("No sponsorship info found");
    primary = sponsorship;
    recipients = [{ name: sponsorship.firstName, email: sponsorship.email }];
  } else if (type === "speakerpass") {
    if (!booking.speakerpass || !booking.speakerpass.length)
      throw new Error("No speaker pass info found");
    primary = booking.speakerpass[0];
    recipients = booking.speakerpass.map((s) => ({ name: s.firstName, email: s.email }));
  } else {
    throw new Error("Unknown booking type");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const invoicePath = path.join(__dirname, `../assets/invoice_${booking._id}.pdf`);
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(fs.createWriteStream(invoicePath));

  // === Logo ===
  const logoPath = path.join(__dirname, "../assets/log112.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 120 });
  }

  // === Title ===
  doc.fontSize(18).fillColor("#000").text("INVOICE", 450, 50, { align: "right" });

  // === Company Info ===
  doc.fontSize(10)
    .text("ARO Events Private Limited", 350, 100, { align: "right" })
    .text("C/41, Natasha Park Residency-II,", { align: "right" })
    .text("Near Maruti Township,", { align: "right" })
    .text("Nizampura, Vadodara, Gujarat", { align: "right" })
    .text("India 390024", { align: "right" })
    .text("GSTIN: 24ABDCA2154Q1ZJ", { align: "right" })
    .text("PAN: ABDCA2154Q", { align: "right" });

  // === Client Info ===
  doc.moveDown(2).fontSize(10).text("Invoice For:", 40, 140);
  if (type === "pass") {
    delegates.forEach((d, i) => {
      doc.text(`${i + 1}. ${d.firstName} | ${d.company || "N/A"} | ${d.email}`, 40);
    });
  } else if (type === "sponsorship") {
    // ✅ Added company for sponsorship
    doc.text(
      `${sponsorship.firstName} ${sponsorship.lastName} | ${sponsorship.company || "N/A"} | ${sponsorship.email} | Package: ${sponsorship.package}`,
      40
    );
  } else if (type === "speakerpass") {
    booking.speakerpass.forEach((s, i) => {
      doc.text(
        `${i + 1}. ${s.firstName} ${s.lastName || ""} | ${s.company || "N/A"} | ${s.email} | Package: ${s.package} | Topic: ${s.topic || "N/A"}`,
        40
      );
    });
  }

  // === Dates ===
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 15);

  doc.moveDown(1)
    .text(`Invoice Date: ${today.toLocaleDateString()}`, 40)
    .text(`Due Date: ${dueDate.toLocaleDateString()}`, 40)
    .text(`Attention of: ${primary.firstName} ${primary.lastName || ""}`, 40);

  // === Table Header ===
  let tableTop = 300;
  const colX = [40, 90, 270, 340, 410, 480, 560];
  const currSymbol = currency === "INR" ? "₹" : "$";

  doc.rect(colX[0], tableTop, colX[6] - colX[0], 20).fill("#1d2163").stroke();
  doc.fillColor("white").fontSize(10);
  doc.text("#", colX[0], tableTop + 5, { width: colX[1] - colX[0], align: "center" });
  doc.text("Description", colX[1], tableTop + 5, { width: colX[2] - colX[1], align: "center" });
  doc.text("Qty", colX[2], tableTop + 5, { width: colX[3] - colX[2], align: "center" });
 doc.text(`Price ${currSymbol}`, colX[3], tableTop + 5, { width: colX[4] - colX[3], align: "center" });
doc.text(`Tax ${currSymbol}`, colX[4], tableTop + 5, { width: colX[5] - colX[4], align: "center" });
doc.text(`Total ${currSymbol}`, colX[5], tableTop + 5, { width: colX[6] - colX[5], align: "center" });


  let rowTop = tableTop + 20;

  // === Draw booking rows helper ===
  const drawBookingRows = (items) => {
    items.forEach((item, i) => {
      drawRow(doc, colX, rowTop, {
        index: i + 1,
        pass: `${item.package}${item.topic ? " – " + item.topic : ""}`,
        qty: 1,
        price: (subtotal / items.length).toFixed(2),
        tax: (tax / items.length).toFixed(2),
        total: ((subtotal + tax) / items.length).toFixed(2),
      });
      rowTop += 22;
    });
  };

  // === Booking Types Table ===
  if (type === "pass") {
    const grouped = {};
    delegates.forEach((d) => {
      if (!grouped[d.passType]) grouped[d.passType] = [];
      grouped[d.passType].push(d);
    });
    let index = 1;
    Object.keys(grouped).forEach((pass) => {
      const qty = grouped[pass].length;
      const unitPrice = subtotal / delegates.length;
      const unitTax = tax / delegates.length;
      const totalForPass = unitPrice * qty + unitTax * qty;

      drawRow(doc, colX, rowTop, {
        index,
        pass,
        qty,
        price: unitPrice.toFixed(2),
        tax: unitTax.toFixed(2),
        total: totalForPass.toFixed(2),
      });
      rowTop += 22;
      index++;
    });
  } else if (type === "sponsorship") {
    drawRow(doc, colX, rowTop, {
      index: 1,
      pass: `${sponsorship.package} Sponsorship`,
      qty: 1,
      price: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    });
    rowTop += 22;
  } else if (type === "speakerpass") {
    drawBookingRows(booking.speakerpass);
  }

  // === Totals ===
  rowTop += 30;
  doc.fontSize(10)
    .text(`Subtotal: ${currSymbol}${subtotal.toFixed(2)}`, 400, rowTop, { align: "right" })
.text(`Discount: -${currSymbol}${discount.toFixed(2)}`, 400, rowTop + 15, { align: "right" })
.text(`Tax: ${currSymbol}${tax.toFixed(2)}`, 400, rowTop + 30, { align: "right" })
.text(`Grand Total: ${currSymbol}${total.toFixed(2)}`, 400, rowTop + 45, { align: "right", underline: true });


  // === Bank Transfer Note ===
  rowTop += 100;
  doc.moveDown(2).fontSize(10).fillColor("black");
  doc.text("Note:", 40, rowTop);
  doc.text("For payment by electronic transmission/wire transfer via the bank, please use details below:", 40, rowTop + 15);
  doc.moveDown(1);
  doc.text("Payable To: ARO EVENTS PRIVATE LIMITED", 40);
  doc.text("Account Number: 50200112667285", 40);
  doc.text("Swift/Bic Code: HDFCINBBXXX", 40);
  doc.text("IFSC Code/Bank Key: HDFC0000389", 40);
  doc.text("Bank Name: HDFC BANK LIMITED", 40);
  doc.text(`Currency: ${currency}`, 40);

  doc.end();

  // === Send emails ===
  for (const rec of recipients) {
    await transporter.sendMail({
      from: `"ARO Events" <${process.env.EMAIL_USER}>`,
      to: rec.email,
      subject: `🎟️ Booking Confirmed`,
      html: `<p>Hi ${rec.name}, your booking is confirmed! Invoice attached.</p>`,
      attachments: [{ filename: `invoice_${booking._id}.pdf`, path: invoicePath }],
    });
  }

  // === Admin copy ===
  await transporter.sendMail({
    from: `"ARO Events" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `📩 New ${type} Booking from ${primary.firstName} ${primary.lastName || ""}`,
    html: `<p>New ${type} booking confirmed.</p>`,
    attachments: [{ filename: `invoice_${booking._id}.pdf`, path: invoicePath }],
  });
}

// === Draw row helper ===
function drawRow(doc, colX, y, data) {
  const rowHeight = 22;
  doc.rect(colX[0], y, colX[6] - colX[0], rowHeight).stroke();
  for (let i = 1; i < colX.length - 1; i++) {
    doc.moveTo(colX[i], y).lineTo(colX[i], y + rowHeight).stroke();
  }
  doc.fontSize(10).fillColor("black");
  doc.text(data.index, colX[0], y + 6, { width: colX[1] - colX[0], align: "center" });
  doc.text(data.pass, colX[1], y + 6, { width: colX[2] - colX[1], align: "center" });
  doc.text(data.qty, colX[2], y + 6, { width: colX[3] - colX[2], align: "center" });
  doc.text(data.price, colX[3], y + 6, { width: colX[4] - colX[3], align: "center" });
  doc.text(data.tax, colX[4], y + 6, { width: colX[5] - colX[4], align: "center" });
  doc.font("Helvetica-Bold").text(data.total, colX[5], y + 6, { width: colX[6] - colX[5], align: "center" });
  doc.font("Helvetica");
}

module.exports = { generateInvoiceAndSendEmail };
