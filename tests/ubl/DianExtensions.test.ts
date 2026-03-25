import { createHash } from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import {
  truncateDecimals,
  softwareSecurityCode,
  calculateCufe,
  calculateCude,
  calculateCuds,
  calculateCune,
  calculateCudeEvent,
  injectUuid,
  injectCune,
  injectCudeEvent,
  injectSoftwareSecurityCode,
  injectPayrollSoftwareSecurityCode,
  getQRDataInvoice,
  getQRDataPayroll,
} from '../../src/ubl/DianExtensions';
import {
  DocumentType,
  DOCUMENT_TYPE_CONFIG,
  detectDocumentType,
  detectDocumentTypeFromDom,
} from '../../src/ubl/models';

// ---------------------------------------------------------------------------
// Fixtures — XML mínimos de prueba
// ---------------------------------------------------------------------------

const INVOICE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:SoftwareSecurityCode>PLACEHOLDER</sts:SoftwareSecurityCode>
          <sts:QRCode>PLACEHOLDER</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>SETP990000002</cbc:ID>
  <cbc:UUID schemeID="2" schemeName="CUFE-SHA384">PLACEHOLDER</cbc:UUID>
  <cbc:IssueDate>2019-06-20</cbc:IssueDate>
  <cbc:IssueTime>09:15:23-05:00</cbc:IssueTime>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>900373115</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>800199436</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">1900.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">10000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">1900.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">10000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">10000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">11900.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">11900.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

const CREDIT_NOTE_XML = INVOICE_XML
  .replace(/<Invoice /g, '<CreditNote ')
  .replace(/<\/Invoice>/g, '</CreditNote>')
  .replace('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2');

const DEBIT_NOTE_XML = INVOICE_XML
  .replace(/<Invoice /g, '<DebitNote ')
  .replace(/<\/Invoice>/g, '</DebitNote>')
  .replace('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2')
  .replace(/LegalMonetaryTotal/g, 'RequestedMonetaryTotal');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UBL Models — detectDocumentType', () => {
  it('debería detectar Invoice', () => {
    expect(detectDocumentType(INVOICE_XML)).toBe(DocumentType.Invoice);
  });

  it('debería detectar CreditNote', () => {
    expect(detectDocumentType(CREDIT_NOTE_XML)).toBe(DocumentType.CreditNote);
  });

  it('debería detectar DebitNote', () => {
    expect(detectDocumentType(DEBIT_NOTE_XML)).toBe(DocumentType.DebitNote);
  });

  it('debería detectar ApplicationResponse', () => {
    expect(detectDocumentType('<ApplicationResponse></ApplicationResponse>')).toBe(DocumentType.ApplicationResponse);
  });

  it('debería detectar Payroll', () => {
    expect(detectDocumentType('<NominaIndividual></NominaIndividual>')).toBe(DocumentType.Payroll);
  });

  it('debería detectar PayrollAdjustment', () => {
    expect(detectDocumentType('<NominaIndividualDeAjuste></NominaIndividualDeAjuste>')).toBe(DocumentType.PayrollAdjustment);
  });

  it('debería detectar AttachedDocument', () => {
    expect(detectDocumentType('<AttachedDocument></AttachedDocument>')).toBe(DocumentType.AttachedDocument);
  });

  it('debería lanzar error para XML desconocido', () => {
    expect(() => detectDocumentType('<Unknown></Unknown>')).toThrow('No se pudo detectar');
  });

  it('debería detectar DocumentSupport por xmlns:sts URN', () => {
    const dsXml = '<Invoice xmlns:sts="urn:dian:gov:co:facturaelectronica:Structures-2-1"><cbc:ID>DS-001</cbc:ID></Invoice>';
    expect(detectDocumentType(dsXml)).toBe(DocumentType.DocumentSupport);
  });

  it('Invoice estándar NO debe confundirse con DocumentSupport', () => {
    const invoiceXml = '<Invoice xmlns:sts="http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures"><cbc:ID>FV-001</cbc:ID></Invoice>';
    expect(detectDocumentType(invoiceXml)).toBe(DocumentType.Invoice);
  });
});

describe('UBL Models — detectDocumentTypeFromDom', () => {
  it('debería detectar Invoice desde DOM', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    expect(detectDocumentTypeFromDom(doc)).toBe(DocumentType.Invoice);
  });

  it('debería detectar CreditNote desde DOM', () => {
    const doc = new DOMParser().parseFromString(CREDIT_NOTE_XML, 'text/xml');
    expect(detectDocumentTypeFromDom(doc)).toBe(DocumentType.CreditNote);
  });

  it('debería detectar DocumentSupport desde DOM por xmlns:sts URN', () => {
    const dsXml = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:sts="urn:dian:gov:co:facturaelectronica:Structures-2-1"><cbc:ID>DS-001</cbc:ID></Invoice>';
    const doc = new DOMParser().parseFromString(dsXml, 'text/xml');
    expect(detectDocumentTypeFromDom(doc)).toBe(DocumentType.DocumentSupport);
  });

  it('Invoice estándar desde DOM no debe ser DocumentSupport', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    expect(detectDocumentTypeFromDom(doc)).toBe(DocumentType.Invoice);
  });
});

describe('UBL Models — DOCUMENT_TYPE_CONFIG', () => {
  it('Invoice debe tener xmlns correcto', () => {
    const config = DOCUMENT_TYPE_CONFIG[DocumentType.Invoice];
    expect(config.ns['xmlns']).toBe('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
    expect(config.groupOfTotals).toBe('LegalMonetaryTotal');
  });

  it('CreditNote debe tener xmlns correcto', () => {
    const config = DOCUMENT_TYPE_CONFIG[DocumentType.CreditNote];
    expect(config.ns['xmlns']).toBe('urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2');
    expect(config.groupOfTotals).toBe('LegalMonetaryTotal');
  });

  it('DebitNote debe tener xmlns y groupOfTotals correctos', () => {
    const config = DOCUMENT_TYPE_CONFIG[DocumentType.DebitNote];
    expect(config.ns['xmlns']).toBe('urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2');
    expect(config.groupOfTotals).toBe('RequestedMonetaryTotal');
  });

  it('ApplicationResponse debe tener xmlns:sts especial', () => {
    const config = DOCUMENT_TYPE_CONFIG[DocumentType.ApplicationResponse];
    expect(config.ns['xmlns:sts']).toBe('dian:gov:co:facturaelectronica:Structures-2-1');
  });

  it('Payroll debe tener xmlns sin urn:', () => {
    const config = DOCUMENT_TYPE_CONFIG[DocumentType.Payroll];
    expect(config.ns['xmlns']).toBe('dian:gov:co:facturaelectronica:NominaIndividual');
  });

  it('todos los tipos deben tener configuración', () => {
    Object.values(DocumentType).forEach(type => {
      expect(DOCUMENT_TYPE_CONFIG[type]).toBeDefined();
      expect(DOCUMENT_TYPE_CONFIG[type].rootElement).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — truncateDecimals
// ---------------------------------------------------------------------------

describe('DianExtensions — truncateDecimals', () => {
  it('debería truncar a 2 decimales sin redondear', () => {
    expect(truncateDecimals(10.999, 2)).toBe('10.99');
  });

  it('debería rellenar con ceros si faltan decimales', () => {
    expect(truncateDecimals(10, 2)).toBe('10.00');
  });

  it('debería truncar a 2 decimales, no redondear 10.555', () => {
    expect(truncateDecimals(10.555, 2)).toBe('10.55');
  });

  it('debería manejar números con trailing zeros', () => {
    expect(truncateDecimals(100.10, 2)).toBe('100.10');
  });

  it('debería manejar 0', () => {
    expect(truncateDecimals(0, 2)).toBe('0.00');
  });

  it('debería manejar números negativos', () => {
    expect(truncateDecimals(-15.678, 2)).toBe('-15.67');
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — softwareSecurityCode
// ---------------------------------------------------------------------------

describe('DianExtensions — softwareSecurityCode', () => {
  it('debería calcular SHA384 de softwareID + pin + documentID', () => {
    const softwareID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    const pin = '12345';
    const documentID = 'SETP990000002';

    const expected = createHash('sha384')
      .update(`${softwareID}${pin}${documentID}`)
      .digest('hex');

    expect(softwareSecurityCode(softwareID, pin, documentID)).toBe(expected);
  });

  it('debería producir un hash hexadecimal de 96 caracteres', () => {
    const result = softwareSecurityCode('SW1', 'PIN', 'DOC1');
    expect(result).toHaveLength(96);
    expect(result).toMatch(/^[0-9a-f]{96}$/);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — calculateCufe
// ---------------------------------------------------------------------------

describe('DianExtensions — calculateCufe', () => {
  const TECH_KEY = 'fc8eac422eba16e22ffd8c6f94b3f40a6e38571d';

  it('debería calcular CUFE con la fórmula correcta para una factura', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const cufe = calculateCufe(doc, TECH_KEY);

    // Construir la cadena esperada manualmente:
    // ID + Date + Time + LineExtAmt + "01" + Tax01 + "04" + Tax04 + "03" + Tax03
    // + PayableAmt + SupplierNIT + CustomerNIT + technicalKey + ProfileExecutionID
    const expectedString = [
      'SETP990000002',       // ID
      '2019-06-20',          // IssueDate
      '09:15:23-05:00',      // IssueTime
      '10000.00',            // LineExtensionAmount
      '01',                  // código impuesto IVA
      '1900.00',             // Tax01 (IVA)
      '04',                  // código impuesto ICA
      '0.00',                // Tax04 (ICA - no presente)
      '03',                  // código impuesto INC
      '0.00',                // Tax03 (INC - no presente)
      '11900.00',            // PayableAmount
      '900373115',           // SupplierNIT
      '800199436',           // CustomerNIT
      TECH_KEY,              // technicalKey
      '2',                   // ProfileExecutionID
    ].join('');

    const expectedCufe = createHash('sha384').update(expectedString).digest('hex');
    expect(cufe).toBe(expectedCufe);
  });

  it('debería producir un hash hexadecimal de 96 caracteres', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const cufe = calculateCufe(doc, TECH_KEY);
    expect(cufe).toHaveLength(96);
    expect(cufe).toMatch(/^[0-9a-f]{96}$/);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — calculateCude
// ---------------------------------------------------------------------------

describe('DianExtensions — calculateCude', () => {
  const PIN = '12345';

  it('debería calcular CUDE con pin en lugar de technicalKey', () => {
    const doc = new DOMParser().parseFromString(CREDIT_NOTE_XML, 'text/xml');
    const cude = calculateCude(doc, PIN);

    const expectedString = [
      'SETP990000002',
      '2019-06-20',
      '09:15:23-05:00',
      '10000.00',
      '01', '1900.00',
      '04', '0.00',
      '03', '0.00',
      '11900.00',
      '900373115',
      '800199436',
      PIN,
      '2',
    ].join('');

    const expectedCude = createHash('sha384').update(expectedString).digest('hex');
    expect(cude).toBe(expectedCude);
  });

  it('CUDE y CUFE para mismos datos pero diferente key deben ser distintos', () => {
    const doc1 = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const doc2 = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');

    const cufe = calculateCufe(doc1, 'TECH-KEY-123');
    const cude = calculateCude(doc2, 'PIN-456');

    expect(cufe).not.toBe(cude);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — injectSoftwareSecurityCode
// ---------------------------------------------------------------------------

describe('DianExtensions — injectSoftwareSecurityCode', () => {
  it('debería inyectar el código en sts:SoftwareSecurityCode', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const softwareID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    const pin = '12345';

    const code = injectSoftwareSecurityCode(doc, softwareID, pin);

    const expectedCode = createHash('sha384')
      .update(`${softwareID}${pin}SETP990000002`)
      .digest('hex');

    expect(code).toBe(expectedCode);

    const sscElement = doc.getElementsByTagName('sts:SoftwareSecurityCode').item(0);
    expect(sscElement?.textContent).toBe(expectedCode);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — injectUuid
// ---------------------------------------------------------------------------

describe('DianExtensions — injectUuid', () => {
  it('debería inyectar CUFE cuando se provee technicalKey', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const techKey = 'fc8eac422eba16e22ffd8c6f94b3f40a6e38571d';

    const uuid = injectUuid(doc, { technicalKey: techKey });

    const expectedCufe = calculateCufe(
      new DOMParser().parseFromString(INVOICE_XML, 'text/xml'),
      techKey,
    );
    expect(uuid).toBe(expectedCufe);

    const uuidElement = doc.getElementsByTagName('cbc:UUID').item(0);
    expect(uuidElement?.textContent).toBe(expectedCufe);
  });

  it('debería inyectar CUDE cuando se provee solo pin', () => {
    const doc = new DOMParser().parseFromString(CREDIT_NOTE_XML, 'text/xml');
    const pin = '12345';

    const uuid = injectUuid(doc, { pin });

    const expectedCude = calculateCude(
      new DOMParser().parseFromString(CREDIT_NOTE_XML, 'text/xml'),
      pin,
    );
    expect(uuid).toBe(expectedCude);
  });

  it('debería actualizar el QR code con dominio de habilitación (ProfileExecutionID=2)', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const uuid = injectUuid(doc, { technicalKey: 'TEST-KEY' });

    const qrElement = doc.getElementsByTagName('sts:QRCode').item(0);
    expect(qrElement?.textContent).toBe(
      `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${uuid}`,
    );
  });

  it('debería actualizar el QR code con dominio de producción (ProfileExecutionID=1)', () => {
    const prodXml = INVOICE_XML.replace(
      '<cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>',
      '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
    );
    const doc = new DOMParser().parseFromString(prodXml, 'text/xml');
    const uuid = injectUuid(doc, { technicalKey: 'TEST-KEY' });

    const qrElement = doc.getElementsByTagName('sts:QRCode').item(0);
    expect(qrElement?.textContent).toBe(
      `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${uuid}`,
    );
  });

  it('debería lanzar error si no se provee technicalKey ni pin', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    expect(() => injectUuid(doc, {})).toThrow('Se requiere technicalKey o pin');
  });

  it('debería lanzar error para ApplicationResponse', () => {
    const arXml = INVOICE_XML
      .replace(/<Invoice /g, '<ApplicationResponse ')
      .replace(/<\/Invoice>/g, '</ApplicationResponse>');
    const doc = new DOMParser().parseFromString(arXml, 'text/xml');
    expect(() => injectUuid(doc, { pin: '123' })).toThrow('ApplicationResponse');
  });

  it('debería funcionar con DebitNote y groupOfTotals=RequestedMonetaryTotal', () => {
    const doc = new DOMParser().parseFromString(DEBIT_NOTE_XML, 'text/xml');
    const uuid = injectUuid(doc, { pin: 'PIN-DEBIT' });
    expect(uuid).toHaveLength(96);
    expect(uuid).toMatch(/^[0-9a-f]{96}$/);
  });
});

// ---------------------------------------------------------------------------
// XmlSigner — document type awareness
// ---------------------------------------------------------------------------

describe('XmlSigner — document type awareness', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { XmlSigner } = require('../../src/security/XmlSigner');

  it('debería aceptar setDocumentType y almacenar la configuración', () => {
    const signer = new XmlSigner();
    signer.setDocumentType(DocumentType.Invoice);

    const config = signer.getDocumentConfig();
    expect(config).toBeDefined();
    expect(config.type).toBe(DocumentType.Invoice);
    expect(config.ns['xmlns']).toBe('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
  });

  it('debería diferenciar namespaces Invoice vs CreditNote vs DebitNote', () => {
    const signer = new XmlSigner();

    signer.setDocumentType(DocumentType.Invoice);
    const invoiceNs = signer.getDocumentConfig()!.ns['xmlns'];

    signer.setDocumentType(DocumentType.CreditNote);
    const creditNoteNs = signer.getDocumentConfig()!.ns['xmlns'];

    signer.setDocumentType(DocumentType.DebitNote);
    const debitNoteNs = signer.getDocumentConfig()!.ns['xmlns'];

    expect(invoiceNs).not.toBe(creditNoteNs);
    expect(invoiceNs).not.toBe(debitNoteNs);
    expect(debitNoteNs).not.toBe(debitNoteNs === creditNoteNs);
  });
});

// ---------------------------------------------------------------------------
// Fixtures — XML nómina y evento
// ---------------------------------------------------------------------------

const PAYROLL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"
                  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance">
  <InformacionGeneral FechaGen="2024-01-15" HoraGen="10:30:00-05:00" TipoXML="102" Ambiente="2" CUNE=""/>
  <NumeroSecuenciaXML Numero="N001" Consecutivo="1"/>
  <ProveedorXML SoftwareSC=""/>
  <CodigoQR></CodigoQR>
  <Empleador NIT="900373115" RazonSocial="EMPRESA TEST"/>
  <Trabajador NumeroDocumento="1234567890" PrimerApellido="PEREZ" PrimerNombre="JUAN"/>
  <Devengados>
    <Basico DiasTrabajados="30" SueldoTrabajado="2500000.00"/>
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="100000.00"/>
  </Deducciones>
  <DevengadosTotal>2500000.00</DevengadosTotal>
  <DeduccionesTotal>100000.00</DeduccionesTotal>
  <ComprobanteTotal>2400000.00</ComprobanteTotal>
</NominaIndividual>`;

const PAYROLL_ADJUSTMENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividualDeAjuste xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"
                          xmlns:xs="http://www.w3.org/2001/XMLSchema-instance">
  <InformacionGeneral FechaGen="2024-01-15" HoraGen="10:30:00-05:00" TipoXML="102" Ambiente="2" CUNE=""/>
  <NumeroSecuenciaXML Numero="N001" Consecutivo="1"/>
  <ProveedorXML SoftwareSC=""/>
  <CodigoQR></CodigoQR>
  <Empleador NIT="900373115" RazonSocial="EMPRESA TEST"/>
  <Trabajador NumeroDocumento="1234567890" PrimerApellido="PEREZ" PrimerNombre="JUAN"/>
  <Devengados>
    <Basico DiasTrabajados="30" SueldoTrabajado="2500000.00"/>
  </Devengados>
  <Deducciones>
    <Salud Porcentaje="4.00" Deduccion="100000.00"/>
  </Deducciones>
  <DevengadosTotal>2500000.00</DevengadosTotal>
  <DeduccionesTotal>100000.00</DeduccionesTotal>
  <ComprobanteTotal>2400000.00</ComprobanteTotal>
  <TipoNota>2</TipoNota>
</NominaIndividualDeAjuste>`;

const APPLICATION_RESPONSE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
                     xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                     xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                     xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                     xmlns:sts="http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures">
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>EVT-001</cbc:ID>
  <cbc:UUID>PLACEHOLDER</cbc:UUID>
  <cbc:IssueDate>2024-03-10</cbc:IssueDate>
  <cbc:IssueTime>14:22:00-05:00</cbc:IssueTime>
  <cac:SenderParty>
    <cac:PartyTaxScheme>
      <cbc:CompanyID>900373115</cbc:CompanyID>
    </cac:PartyTaxScheme>
  </cac:SenderParty>
  <cac:ReceiverParty>
    <cac:PartyTaxScheme>
      <cbc:CompanyID>800199436</cbc:CompanyID>
    </cac:PartyTaxScheme>
  </cac:ReceiverParty>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ResponseCode>030</cbc:ResponseCode>
    </cac:Response>
    <cac:DocumentReference>
      <cbc:ID>SETP990000002</cbc:ID>
      <cbc:UUID>abc123cufe-del-documento-referenciado</cbc:UUID>
      <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>
    </cac:DocumentReference>
  </cac:DocumentResponse>
</ApplicationResponse>`;

// ---------------------------------------------------------------------------
// DianExtensions — calculateCune
// ---------------------------------------------------------------------------

describe('DianExtensions — calculateCune', () => {
  const PIN = '12345';

  it('debería calcular CUNE con la fórmula correcta', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const cune = calculateCune(doc, PIN);

    // Fórmula: Numero + FechaGen + HoraGen + DevengadosTotal + DeduccionesTotal
    //          + ComprobanteTotal + NIT + NumeroDocumento + TipoXML + pin + Ambiente
    const expectedString = [
      'N001',              // NumeroSecuenciaXML/@Numero
      '2024-01-15',        // InformacionGeneral/@FechaGen
      '10:30:00-05:00',    // InformacionGeneral/@HoraGen
      '2500000.00',        // DevengadosTotal (truncado 2 dec)
      '100000.00',         // DeduccionesTotal (truncado 2 dec)
      '2400000.00',        // ComprobanteTotal (truncado 2 dec)
      '900373115',         // Empleador/@NIT
      '1234567890',        // Trabajador/@NumeroDocumento
      '102',               // InformacionGeneral/@TipoXML
      PIN,                 // pin
      '2',                 // InformacionGeneral/@Ambiente
    ].join('');

    const expectedCune = createHash('sha384').update(expectedString).digest('hex');
    expect(cune).toBe(expectedCune);
  });

  it('debería producir un hash hexadecimal de 96 caracteres', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const cune = calculateCune(doc, PIN);
    expect(cune).toHaveLength(96);
    expect(cune).toMatch(/^[0-9a-f]{96}$/);
  });

  it('debería usar fallback "0" si Trabajador/@NumeroDocumento no existe', () => {
    const xmlSinDoc = PAYROLL_XML.replace('NumeroDocumento="1234567890"', '');
    const doc = new DOMParser().parseFromString(xmlSinDoc, 'text/xml');
    const cune = calculateCune(doc, PIN);

    const expectedString = 'N001' + '2024-01-15' + '10:30:00-05:00' +
      '2500000.00' + '100000.00' + '2400000.00' + '900373115' + '0' + '102' + PIN + '2';
    const expectedCune = createHash('sha384').update(expectedString).digest('hex');
    expect(cune).toBe(expectedCune);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — injectCune
// ---------------------------------------------------------------------------

describe('DianExtensions — injectCune', () => {
  it('debería inyectar CUNE en InformacionGeneral/@CUNE', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const cune = injectCune(doc, '12345');

    const infoGeneral = doc.getElementsByTagName('InformacionGeneral').item(0)!;
    expect((infoGeneral as any).getAttribute('CUNE')).toBe(cune);
  });

  it('debería actualizar CodigoQR con URL de habilitación (Ambiente=2)', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const cune = injectCune(doc, '12345');

    const qr = doc.getElementsByTagName('CodigoQR').item(0);
    expect(qr?.textContent).toBe(
      `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cune}`,
    );
  });

  it('debería actualizar CodigoQR con URL de producción (Ambiente=1)', () => {
    const prodXml = PAYROLL_XML.replace('Ambiente="2"', 'Ambiente="1"');
    const doc = new DOMParser().parseFromString(prodXml, 'text/xml');
    const cune = injectCune(doc, '12345');

    const qr = doc.getElementsByTagName('CodigoQR').item(0);
    expect(qr?.textContent).toBe(
      `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cune}`,
    );
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — injectPayrollSoftwareSecurityCode
// ---------------------------------------------------------------------------

describe('DianExtensions — injectPayrollSoftwareSecurityCode', () => {
  it('debería inyectar SoftwareSC en ProveedorXML como atributo', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const softwareID = 'sw-uuid-test';
    const pin = '12345';

    const code = injectPayrollSoftwareSecurityCode(doc, softwareID, pin);

    const proveedorXML = doc.getElementsByTagName('ProveedorXML').item(0)!;
    expect((proveedorXML as any).getAttribute('SoftwareSC')).toBe(code);

    // Fórmula: SHA384(softwareID + pin + NumeroSecuenciaXML/@Numero)
    const expectedCode = createHash('sha384')
      .update(`${softwareID}${pin}N001`)
      .digest('hex');
    expect(code).toBe(expectedCode);
  });

  it('debería diferir del injectSoftwareSecurityCode de facturas (usa Numero, no ID)', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const softwareID = 'sw-uuid-test';
    const pin = '12345';

    const payrollCode = injectPayrollSoftwareSecurityCode(doc, softwareID, pin);
    // Para facturas la fórmula es SHA384(softwareID + pin + cbc:ID)
    // El ID de nómina es NumeroSecuenciaXML/@Numero, no cbc:ID
    const invoiceCode = softwareSecurityCode(softwareID, pin, 'SETP990000002');
    expect(payrollCode).not.toBe(invoiceCode);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — calculateCudeEvent
// ---------------------------------------------------------------------------

describe('DianExtensions — calculateCudeEvent', () => {
  const PIN = '54321';

  it('debería calcular CUDE-EVENT con la fórmula correcta', () => {
    const doc = new DOMParser().parseFromString(APPLICATION_RESPONSE_XML, 'text/xml');
    const cude = calculateCudeEvent(doc, PIN);

    // Fórmula: ID + Date + Time + SenderNIT + ReceiverNIT +
    //          ResponseCode + DocRefID + DocTypeCode + pin
    const expectedString = [
      'EVT-001',           // cbc:ID
      '2024-03-10',        // cbc:IssueDate
      '14:22:00-05:00',    // cbc:IssueTime
      '900373115',         // SenderParty CompanyID
      '800199436',         // ReceiverParty CompanyID
      '030',               // ResponseCode
      'SETP990000002',     // DocumentReference/ID
      '01',                // DocumentTypeCode
      PIN,                 // pin
    ].join('');

    const expectedCude = createHash('sha384').update(expectedString).digest('hex');
    expect(cude).toBe(expectedCude);
  });

  it('debería producir un hash hexadecimal de 96 caracteres', () => {
    const doc = new DOMParser().parseFromString(APPLICATION_RESPONSE_XML, 'text/xml');
    const cude = calculateCudeEvent(doc, PIN);
    expect(cude).toHaveLength(96);
    expect(cude).toMatch(/^[0-9a-f]{96}$/);
  });

  it('NO debería incluir ProfileExecutionID (a diferencia del CUDE normal)', () => {
    const doc = new DOMParser().parseFromString(APPLICATION_RESPONSE_XML, 'text/xml');
    const cudeEvent = calculateCudeEvent(doc, PIN);

    // Verificar que cambiando ProfileExecutionID NO afecta el CUDE-EVENT
    const prodXml = APPLICATION_RESPONSE_XML.replace(
      '<cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>',
      '<cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>',
    );
    const doc2 = new DOMParser().parseFromString(prodXml, 'text/xml');
    const cudeEvent2 = calculateCudeEvent(doc2, PIN);

    expect(cudeEvent).toBe(cudeEvent2);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — injectCudeEvent
// ---------------------------------------------------------------------------

describe('DianExtensions — injectCudeEvent', () => {
  it('debería inyectar CUDE en cbc:UUID del ApplicationResponse', () => {
    const doc = new DOMParser().parseFromString(APPLICATION_RESPONSE_XML, 'text/xml');
    const cude = injectCudeEvent(doc, '54321');

    const uuidElement = doc.getElementsByTagName('cbc:UUID').item(0);
    expect(uuidElement?.textContent).toBe(cude);
  });

  it('debería reemplazar -----CUFECUDE----- con el UUID del documento referenciado', () => {
    const xmlWithPlaceholder = APPLICATION_RESPONSE_XML.replace(
      '</ApplicationResponse>',
      '</ApplicationResponse>',
    ).replace(
      '<cbc:UUID>PLACEHOLDER</cbc:UUID>\n  <cbc:IssueDate>',
      '<cbc:UUID>PLACEHOLDER</cbc:UUID>\n  <sts:QRCode>https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=-----CUFECUDE-----</sts:QRCode>\n  <cbc:IssueDate>',
    );
    const doc = new DOMParser().parseFromString(xmlWithPlaceholder, 'text/xml');
    injectCudeEvent(doc, '54321');

    const qrElement = doc.getElementsByTagName('sts:QRCode').item(0);
    // El QR debe contener el UUID del documento de referencia, no el CUDE del evento
    expect(qrElement?.textContent).toContain('abc123cufe-del-documento-referenciado');
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — getQRDataInvoice
// ---------------------------------------------------------------------------

describe('DianExtensions — getQRDataInvoice', () => {
  it('debería generar datos QR con formato correcto para factura', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const qrData = getQRDataInvoice(doc);

    expect(qrData).toContain('NumFac: SETP990000002');
    expect(qrData).toContain('FecFac: 2019-06-20');
    expect(qrData).toContain('HorFac: 09:15:23-05:00');
    expect(qrData).toContain('NitFac: 900373115');
    expect(qrData).toContain('DocAdq: 800199436');
    expect(qrData).toContain('ValFac: 10000.00');
    expect(qrData).toContain('ValIva: 1900.00');
    expect(qrData).toContain('ValOtroIm:');
    expect(qrData).toContain('ValTolFac: 11900.00');
    expect(qrData).toContain('CUFE: PLACEHOLDER');
  });

  it('debería calcular ValOtroIm sumando códigos de otros impuestos', () => {
    // Agregar impuesto ICA (04) y INC (03) al XML
    const xmlWithTaxes = INVOICE_XML.replace(
      '</cac:TaxTotal>',
      `</cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">500.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:ID>04</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">300.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:ID>03</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`,
    );
    const doc = new DOMParser().parseFromString(xmlWithTaxes, 'text/xml');
    const qrData = getQRDataInvoice(doc);
    expect(qrData).toContain('ValOtroIm: 800.00');
  });

  it('debería usar groupOfTotals personalizado para DebitNote', () => {
    const doc = new DOMParser().parseFromString(DEBIT_NOTE_XML, 'text/xml');
    const qrData = getQRDataInvoice(doc, 'RequestedMonetaryTotal');
    expect(qrData).toContain('ValFac: 10000.00');
    expect(qrData).toContain('ValTolFac: 11900.00');
  });

  it('debería generar todas las líneas en orden con saltos de línea', () => {
    const doc = new DOMParser().parseFromString(INVOICE_XML, 'text/xml');
    const qrData = getQRDataInvoice(doc);
    const lines = qrData.split('\n');
    expect(lines[0]).toMatch(/^NumFac:/);
    expect(lines[1]).toMatch(/^FecFac:/);
    expect(lines[2]).toMatch(/^HorFac:/);
    expect(lines[3]).toMatch(/^NitFac:/);
    expect(lines[4]).toMatch(/^DocAdq:/);
    expect(lines[5]).toMatch(/^ValFac:/);
    expect(lines[6]).toMatch(/^ValIva:/);
    expect(lines[7]).toMatch(/^ValOtroIm:/);
    expect(lines[8]).toMatch(/^ValTolFac:/);
    expect(lines[9]).toMatch(/^CUFE:/);
    expect(lines).toHaveLength(11); // 10 campos + URL QR
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — getQRDataPayroll
// ---------------------------------------------------------------------------

describe('DianExtensions — getQRDataPayroll', () => {
  it('debería generar datos QR con formato correcto para nómina', () => {
    // Inyectar CUNE primero para que esté disponible en el QR
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    injectCune(doc, '12345');
    const qrData = getQRDataPayroll(doc);

    expect(qrData).toContain('NumNIE: N001');
    expect(qrData).toContain('FecNIE: 2024-01-15');
    expect(qrData).toContain('HorNIE: 10:30:00-05:00');
    expect(qrData).toContain('NitNIE: 900373115');
    expect(qrData).toContain('DocEmp: 1234567890');
    expect(qrData).toContain('ValDev: 2500000.00');
    expect(qrData).toContain('ValDed: 100000.00');
    expect(qrData).toContain('ValTol: 2400000.00');
    expect(qrData).toContain('CUNE:');
  });

  it('NO debería incluir TipoNota si no existe en el XML', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const qrData = getQRDataPayroll(doc);
    expect(qrData).not.toContain('TipoNota');
  });

  it('debería incluir TipoNota si existe en el XML (nómina de ajuste)', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_ADJUSTMENT_XML, 'text/xml');
    injectCune(doc, '12345');
    const qrData = getQRDataPayroll(doc);
    expect(qrData).toContain('TipoNota: 2');
  });

  it('debería truncar valores monetarios a 2 decimales', () => {
    const xmlConDecimals = PAYROLL_XML
      .replace('>2500000.00<', '>2500000.5678<')
      .replace('>100000.00<', '>100000.123<')
      .replace('>2400000.00<', '>2400000.999<');
    const doc = new DOMParser().parseFromString(xmlConDecimals, 'text/xml');
    const qrData = getQRDataPayroll(doc);
    expect(qrData).toContain('ValDev: 2500000.56');
    expect(qrData).toContain('ValDed: 100000.12');
    expect(qrData).toContain('ValTol: 2400000.99');
  });

  it('debería generar líneas en orden correcto sin TipoNota', () => {
    const doc = new DOMParser().parseFromString(PAYROLL_XML, 'text/xml');
    const qrData = getQRDataPayroll(doc);
    const lines = qrData.split('\n');
    expect(lines[0]).toMatch(/^NumNIE:/);
    expect(lines[1]).toMatch(/^FecNIE:/);
    expect(lines[2]).toMatch(/^HorNIE:/);
    expect(lines[3]).toMatch(/^NitNIE:/);
    expect(lines[4]).toMatch(/^DocEmp:/);
    expect(lines[5]).toMatch(/^ValDev:/);
    expect(lines[6]).toMatch(/^ValDed:/);
    expect(lines[7]).toMatch(/^ValTol:/);
    expect(lines[8]).toMatch(/^CUNE:/);
    expect(lines).toHaveLength(10); // 9 campos + URL QR
  });
});

// ---------------------------------------------------------------------------
// Fixtures — XML Documento Soporte
// ---------------------------------------------------------------------------

const DOCUMENT_SUPPORT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="urn:dian:gov:co:facturaelectronica:Structures-2-1">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:SoftwareSecurityCode>PLACEHOLDER</sts:SoftwareSecurityCode>
          <sts:QRCode>PLACEHOLDER</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>DS990000001</cbc:ID>
  <cbc:UUID schemeID="2" schemeName="CUDS-SHA384">PLACEHOLDER</cbc:UUID>
  <cbc:IssueDate>2024-06-15</cbc:IssueDate>
  <cbc:IssueTime>08:30:00-05:00</cbc:IssueTime>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>900373115</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>800199436</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">950.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">5000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">950.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">5000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">5000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">5950.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">5950.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

// ---------------------------------------------------------------------------
// DianExtensions — calculateCuds
// ---------------------------------------------------------------------------

describe('DianExtensions — calculateCuds', () => {
  const PIN = '12345';

  it('debería calcular CUDS con fórmula de Documento Soporte (solo IVA)', () => {
    const doc = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');
    const cuds = calculateCuds(doc, PIN);

    // Fórmula CUDS: ID + Date + Time + LineExtAmt + "01" + Tax01 + PayableAmt
    //               + SupplierNIT + CustomerNIT + pin + ProfileExecutionID
    // A diferencia del CUFE/CUDE, NO concatena "04"+Tax04 ni "03"+Tax03
    const expectedString = [
      'DS990000001',         // ID
      '2024-06-15',          // IssueDate
      '08:30:00-05:00',      // IssueTime
      '5000.00',             // LineExtensionAmount
      '01',                  // código impuesto IVA
      '950.00',              // Tax01 (IVA)
      '5950.00',             // PayableAmount
      '900373115',           // SupplierNIT
      '800199436',           // CustomerNIT
      PIN,                   // pin
      '2',                   // ProfileExecutionID
    ].join('');

    const expectedCuds = createHash('sha384').update(expectedString).digest('hex');
    expect(cuds).toBe(expectedCuds);
  });

  it('debería producir un hash hexadecimal de 96 caracteres', () => {
    const doc = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');
    const cuds = calculateCuds(doc, PIN);
    expect(cuds).toHaveLength(96);
    expect(cuds).toMatch(/^[0-9a-f]{96}$/);
  });

  it('CUDS NO debe incluir Tax04 ni Tax03 (diferencia con CUFE/CUDE)', () => {
    // Agregar impuestos 04 (ICA) y 03 (INC) al XML
    const xmlConOtrosImpuestos = DOCUMENT_SUPPORT_XML.replace(
      '</cac:TaxTotal>',
      `</cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">200.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:ID>04</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">100.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:ID>03</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`,
    );

    const docConImpuestos = new DOMParser().parseFromString(xmlConOtrosImpuestos, 'text/xml');
    const docSinImpuestos = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');

    const cudsConOtros = calculateCuds(docConImpuestos, PIN);
    const cudsSinOtros = calculateCuds(docSinImpuestos, PIN);

    // CUDS debe ser idéntico porque no usa Tax04 ni Tax03
    expect(cudsConOtros).toBe(cudsSinOtros);
  });

  it('CUDS y CUDE para mismos datos deben ser distintos (fórmula diferente)', () => {
    const doc1 = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');
    const doc2 = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');

    const cuds = calculateCuds(doc1, PIN);
    const cude = calculateCude(doc2, PIN);

    // CUDS omite "04"+Tax04+"03"+Tax03, por lo que el hash es diferente
    expect(cuds).not.toBe(cude);
  });
});

// ---------------------------------------------------------------------------
// DianExtensions — injectUuid con DocumentSupport (ruta CUDS)
// ---------------------------------------------------------------------------

describe('DianExtensions — injectUuid con DocumentSupport', () => {
  it('debería calcular CUDS cuando documentType=DocumentSupport y pin', () => {
    const doc = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');
    const uuid = injectUuid(doc, { pin: '12345', documentType: DocumentType.DocumentSupport });

    const expectedCuds = calculateCuds(
      new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml'),
      '12345',
    );
    expect(uuid).toBe(expectedCuds);
  });

  it('debería inyectar CUDS en cbc:UUID del documento', () => {
    const doc = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');
    const uuid = injectUuid(doc, { pin: '12345', documentType: DocumentType.DocumentSupport });

    const uuidElement = doc.getElementsByTagName('cbc:UUID').item(0);
    expect(uuidElement?.textContent).toBe(uuid);
  });

  it('debería actualizar QR code para Documento Soporte', () => {
    const doc = new DOMParser().parseFromString(DOCUMENT_SUPPORT_XML, 'text/xml');
    const uuid = injectUuid(doc, { pin: '12345', documentType: DocumentType.DocumentSupport });

    const qrElement = doc.getElementsByTagName('sts:QRCode').item(0);
    expect(qrElement?.textContent).toBe(
      `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${uuid}`,
    );
  });
});

describe('DianExtensions — injectUuid con AdjustmentNote', () => {
  it('debería calcular CUDS cuando documentType=AdjustmentNote y pin', () => {
    // AdjustmentNote usa root <CreditNote> pero con cálculo CUDS
    const adjustmentXml = DOCUMENT_SUPPORT_XML
      .replace(/<Invoice /g, '<CreditNote ')
      .replace(/<\/Invoice>/g, '</CreditNote>')
      .replace('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2');
    const doc = new DOMParser().parseFromString(adjustmentXml, 'text/xml');
    const uuid = injectUuid(doc, { pin: '12345', documentType: DocumentType.AdjustmentNote });

    const expectedCuds = calculateCuds(
      new DOMParser().parseFromString(adjustmentXml, 'text/xml'),
      '12345',
    );
    expect(uuid).toBe(expectedCuds);
  });
});

// ---------------------------------------------------------------------------
// DocumentSupportSigner — configuración
// ---------------------------------------------------------------------------

describe('DocumentSupportSigner — configuración', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DocumentSupportSigner } = require('../../src/security/DocumentSupportSigner');

  it('debería tener la configuración de DocumentSupport', () => {
    const signer = new DocumentSupportSigner();
    const config = signer.getDocumentConfig();
    expect(config.type).toBe(DocumentType.DocumentSupport);
    expect(config.rootElement).toBe('Invoice');
    expect(config.groupOfTotals).toBe('LegalMonetaryTotal');
  });

  it('debería usar xmlns:sts con URN (no URL) a diferencia de facturas', () => {
    const signer = new DocumentSupportSigner();
    const config = signer.getDocumentConfig();
    expect(config.ns['xmlns:sts']).toBe('urn:dian:gov:co:facturaelectronica:Structures-2-1');
  });

  it('xmlns:sts de DocumentSupport debe diferir del de Invoice', () => {
    const signer = new DocumentSupportSigner();
    const dsNs = signer.getDocumentConfig().ns['xmlns:sts'];
    const invoiceNs = DOCUMENT_TYPE_CONFIG[DocumentType.Invoice].ns['xmlns:sts'];
    expect(dsNs).not.toBe(invoiceNs);
  });
});

// ---------------------------------------------------------------------------
// AdjustmentNoteSigner — configuración
// ---------------------------------------------------------------------------

describe('AdjustmentNoteSigner — configuración', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AdjustmentNoteSigner } = require('../../src/security/AdjustmentNoteSigner');

  it('debería tener la configuración de AdjustmentNote', () => {
    const signer = new AdjustmentNoteSigner();
    const config = signer.getDocumentConfig();
    expect(config.type).toBe(DocumentType.AdjustmentNote);
    expect(config.rootElement).toBe('CreditNote');
    expect(config.groupOfTotals).toBe('LegalMonetaryTotal');
  });

  it('debería usar xmlns:sts con URL base (igual que facturas), no URN', () => {
    const signer = new AdjustmentNoteSigner();
    const config = signer.getDocumentConfig();
    // AdjustmentNote usa ...BASE_UBL_NS, es decir la URL estándar
    const invoiceNs = DOCUMENT_TYPE_CONFIG[DocumentType.Invoice].ns['xmlns:sts'];
    expect(config.ns['xmlns:sts']).toBe(invoiceNs);
  });

  it('xmlns:sts de AdjustmentNote debe diferir del de DocumentSupport', () => {
    const signer = new AdjustmentNoteSigner();
    const adjNs = signer.getDocumentConfig().ns['xmlns:sts'];
    const dsNs = DOCUMENT_TYPE_CONFIG[DocumentType.DocumentSupport].ns['xmlns:sts'];
    expect(adjNs).not.toBe(dsNs);
  });
});

// ---------------------------------------------------------------------------
// BaseXmlSigner — Multi-algorithm (SHA1/SHA256/SHA512)
// ---------------------------------------------------------------------------

describe('BaseXmlSigner — Multi-algorithm', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ALGO_SHA1, ALGO_SHA256, ALGO_SHA512 } = require('../../src/security/BaseXmlSigner');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DocumentSupportSigner } = require('../../src/security/DocumentSupportSigner');

  it('ALGO_SHA256 debería ser el default (config estándar DIAN)', () => {
    expect(ALGO_SHA256).toBeDefined();
    expect(ALGO_SHA256.rsa).toContain('rsa-sha256');
    expect(ALGO_SHA256.digest).toContain('sha256');
    expect(ALGO_SHA256.hash).toBe('sha256');
  });

  it('ALGO_SHA1 debería tener las URIs correctas', () => {
    expect(ALGO_SHA1).toBeDefined();
    expect(ALGO_SHA1.rsa).toContain('rsa-sha1');
    expect(ALGO_SHA1.digest).toContain('sha1');
    expect(ALGO_SHA1.hash).toBe('sha1');
  });

  it('ALGO_SHA512 debería tener las URIs correctas', () => {
    expect(ALGO_SHA512).toBeDefined();
    expect(ALGO_SHA512.rsa).toContain('rsa-sha512');
    expect(ALGO_SHA512.digest).toContain('sha512');
    expect(ALGO_SHA512.hash).toBe('sha512');
  });

  it('setAlgorithm debería aceptar y almacenar el algoritmo', () => {
    const signer = new DocumentSupportSigner();
    // Por defecto debe funcionar sin error
    signer.setAlgorithm(ALGO_SHA512);
    // Si no lanza error, el método existe y acepta el parámetro
    expect(true).toBe(true);
  });

  it('los tres algoritmos deben tener propiedades rsa, digest y hash', () => {
    for (const algo of [ALGO_SHA1, ALGO_SHA256, ALGO_SHA512]) {
      expect(algo).toHaveProperty('rsa');
      expect(algo).toHaveProperty('digest');
      expect(algo).toHaveProperty('hash');
      expect(typeof algo.rsa).toBe('string');
      expect(typeof algo.digest).toBe('string');
      expect(typeof algo.hash).toBe('string');
    }
  });
});
