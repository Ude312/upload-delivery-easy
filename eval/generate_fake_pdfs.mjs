// eval/generate_fake_pdfs.mjs
// Generates 10 realistic but fictional test PDFs in Fake_Test_Data/
// Usage: node eval/generate_fake_pdfs.mjs

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "Fake_Test_Data");
mkdirSync(outDir, { recursive: true });

function createPdf(filename, buildFn) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = createWriteStream(path.join(outDir, filename));
    doc.pipe(stream);
    buildFn(doc);
    doc.end();
    stream.on("finish", () => {
      console.log(`✅ ${filename}`);
      resolve();
    });
  });
}

const docs = [
  // Test01 — Lieferschein ifm, single sensor, with order number
  ["Test01.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Lieferschein", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("ifm electronic gmbh");
    doc.text("Friedrichstr. 1, 45128 Essen");
    doc.text("Tel: +49 800 16 16 16 4");
    doc.moveDown();
    doc.text("Empfänger:");
    doc.text("Demo GmbH & Co. KGaA");
    doc.text("Musterstraße 31, 37574 Musterstadt");
    doc.moveDown();
    doc.text("Lieferschein-Nr.:   LS-2025-001234");
    doc.text("Ihre Bestell-Nr.:   4500191001");
    doc.text("Datum:              15.10.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.    Bezeichnung                    Menge");
    doc.font("Helvetica").text("1     O5D100       Abstandssensor ifm O5D100       2 Stk");
    doc.moveDown();
    doc.text("Versandbedingung: Standard Transport per UPS");
  }],

  // Test02 — Lieferschein Festo, pneumatic cylinder, with order number
  ["Test02.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Lieferschein", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Festo SE & Co. KG");
    doc.text("Ruiter Str. 82, 73734 Esslingen");
    doc.moveDown();
    doc.text("Empfänger: Demo GmbH & Co. KGaA, Musterstraße 31, 37574 Musterstadt");
    doc.moveDown();
    doc.text("Lieferschein-Nr.:   LS-2025-005521");
    doc.text("Bestellnummer:      4500192002");
    doc.text("Lieferdatum:        22.10.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.      Bezeichnung                        Menge");
    doc.font("Helvetica").text("1     DSBC-63-200-PA  Normzylinder DSBC-63-200-PA        1 Stk");
    doc.text("2     FESTO-KIT-001   Montageset                         1 Stk");
    doc.moveDown();
    doc.text("Incoterms: DAP Musterstadt");
  }],

  // Test03 — Auftragsbestätigung Siemens, PLC, with order number
  ["Test03.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Auftragsbestätigung", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Siemens AG");
    doc.text("Werner-von-Siemens-Str. 1, 80333 München");
    doc.moveDown();
    doc.text("Kunde: Demo GmbH & Co. KGaA");
    doc.text("Ihre Bestellung vom: 01.11.2025");
    doc.text("Ihre Bestellnummer:  4500193003");
    doc.text("Datum:               05.11.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.           Bezeichnung                    Menge");
    doc.font("Helvetica").text("1     6ES7214-1AG40-0XB0   SIMATIC S7-1200 CPU 1214C      1 Stk");
    doc.text("2     6ES7221-1BF32-0XB0   SM 1221 Digitaleingang         1 Stk");
    doc.moveDown();
    doc.text("Liefertermin: KW 48/2025");
  }],

  // Test04 — Rechnung Rittal, enclosure, with order number
  ["Test04.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Rechnung", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Rittal GmbH & Co. KG");
    doc.text("Auf dem Stützelberg, 35745 Herborn");
    doc.text("Steuernr.: DE123456789");
    doc.moveDown();
    doc.text("Rechnungsempfänger: Demo GmbH & Co. KGaA, Musterstraße 31, 37574 Musterstadt");
    doc.moveDown();
    doc.text("Rechnungs-Nr.:  RE-2025-009981");
    doc.text("Ihre Referenz:  4500194004");
    doc.text("Rechnungsdatum: 03.11.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.   Bezeichnung                    Menge   Preis");
    doc.font("Helvetica").text("1     AE 1380.500  Schaltschrank AE 1380.500       2 Stk   1.240,00 EUR");
    doc.moveDown();
    doc.text("Netto: 1.240,00 EUR  |  MwSt 19%: 235,60 EUR  |  Gesamt: 1.475,60 EUR");
    doc.text("Zahlungsziel: 30 Tage netto");
  }],

  // Test05 — Angebot Phoenix Contact, terminals, NO order number
  ["Test05.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Angebot", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Phoenix Contact GmbH & Co. KG");
    doc.text("Flachsmarktstr. 8, 32825 Blomberg");
    doc.moveDown();
    doc.text("Angebots-Nr.:  AN-2025-003344");
    doc.text("Kunde:         Demo GmbH & Co. KGaA");
    doc.text("Datum:         10.11.2025");
    doc.text("Gültig bis:    10.12.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.  Bezeichnung                    Menge   Preis");
    doc.font("Helvetica").text("1     0441641     Reihenklemme UK 6 N            100 Stk  85,00 EUR");
    doc.text("2     3031204     Endhalter E/UK                 10 Stk   12,00 EUR");
    doc.moveDown();
    doc.text("Netto: 97,00 EUR  |  MwSt 19%: 18,43 EUR  |  Gesamt: 115,43 EUR");
  }],

  // Test06 — Datenblatt Beckhoff, EtherCAT terminal, NO order number
  ["Test06.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Datenblatt", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Beckhoff Automation GmbH & Co. KG");
    doc.text("Hülshorstweg 20, 33415 Verl");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Produkt: EtherCAT-Klemme EL1008");
    doc.font("Helvetica");
    doc.text("Artikelnummer: EL1008");
    doc.text("Datum: 01.01.2024");
    doc.moveDown();
    doc.text("Beschreibung:");
    doc.text("Die EL1008 ist eine 8-Kanal-Digital-Eingangsklemme 24 V DC.");
    doc.text("Technische Daten:");
    doc.text("- Eingangsspannung: 24 V DC");
    doc.text("- Anzahl Eingänge: 8");
    doc.text("- Anschluss: Federkraftklemme");
  }],

  // Test07 — Rechnung Wago, terminals, with order number
  ["Test07.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Rechnung", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("WAGO GmbH & Co. KG");
    doc.text("Hansastr. 27, 32423 Minden");
    doc.moveDown();
    doc.text("Rechnungsempfänger: Demo GmbH & Co. KGaA");
    doc.text("Rechnungs-Nr.:  RE-WAGO-2025-7712");
    doc.text("Ihre Bestellung: 4500195007");
    doc.text("Datum:           18.11.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.  Bezeichnung                    Menge   Preis");
    doc.font("Helvetica").text("1     221-413     WAGO Klemme 221-413            50 Stk   47,50 EUR");
    doc.text("2     221-412     WAGO Klemme 221-412            50 Stk   42,00 EUR");
    doc.moveDown();
    doc.text("Netto: 89,50 EUR  |  MwSt 19%: 17,01 EUR  |  Gesamt: 106,51 EUR");
  }],

  // Test08 — Lieferschein Murr, field distributor, with order number
  ["Test08.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Lieferschein", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Murrelektronik GmbH");
    doc.text("Falkenstraße 3, 71570 Oppenweiler");
    doc.moveDown();
    doc.text("Empfänger: Demo GmbH & Co. KGaA, Musterstraße 31, 37574 Musterstadt");
    doc.moveDown();
    doc.text("Lieferschein-Nr.:  LS-MURR-2025-4421");
    doc.text("Bestell-Nr.:       4500196008");
    doc.text("Lieferdatum:       25.11.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.  Bezeichnung                    Menge");
    doc.font("Helvetica").text("1     56601       Feldverteiler MVK Metal         1 Stk");
    doc.moveDown();
    doc.text("Versandart: Paketdienst DHL");
  }],

  // Test09 — Konformitätserklärung Pilz, safety relay, NO order number
  ["Test09.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Konformitätserklärung", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Pilz GmbH & Co. KG");
    doc.text("Felix-Wankel-Str. 2, 73760 Ostfildern");
    doc.moveDown();
    doc.text("Produkt:       PNOZ s4 24VDC");
    doc.text("Artikelnummer: 750104");
    doc.text("Datum:         14.03.2024");
    doc.moveDown();
    doc.text("Hiermit erklären wir, dass das oben genannte Produkt den");
    doc.text("Anforderungen der folgenden EU-Richtlinien entspricht:");
    doc.text("- Maschinenrichtlinie 2006/42/EG");
    doc.text("- Niederspannungsrichtlinie 2014/35/EU");
    doc.text("- EMV-Richtlinie 2014/30/EU");
    doc.moveDown();
    doc.text("Unterschrift: ________________________");
    doc.text("Ostfildern, 14.03.2024");
  }],

  // Test10 — Angebot Offgridtec, solar system, NO order number
  ["Test10.pdf", (doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("Angebot", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).font("Helvetica");
    doc.text("Offgridtec GmbH");
    doc.text("Im Gewerbepark 11, 84307 Eggenfelden");
    doc.text("info@offgridtec.com");
    doc.moveDown();
    doc.text("Angebots-Nr.:  AN-OGT-2025-8899");
    doc.text("Kunde:         Demo GmbH & Co. KGaA");
    doc.text("Datum:         28.11.2025");
    doc.text("Gültig bis:    28.12.2025");
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Pos.  Artikelnr.        Bezeichnung                    Menge   Preis");
    doc.font("Helvetica").text("1     SOL-400W-MONO    Solarmodul 400W monokristallin  4 Stk   1.200,00 EUR");
    doc.text("2     INV-3000W-24V   Wechselrichter 3000W 24V        1 Stk     480,00 EUR");
    doc.text("3     BAT-100AH-AGM   Batterie 100Ah AGM               2 Stk     360,00 EUR");
    doc.moveDown();
    doc.text("Netto: 2.040,00 EUR  |  MwSt 19%: 387,60 EUR  |  Gesamt: 2.427,60 EUR");
  }],
];

console.log("Generating fake test PDFs...\n");
for (const [filename, buildFn] of docs) {
  await createPdf(filename, buildFn);
}
console.log("\nDone! Files saved to Fake_Test_Data/");
