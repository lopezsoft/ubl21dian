import { DOMParser } from 'xmldom';
import { PayrollSigner } from '../../src/security/PayrollSigner';
import { DocumentSupportSigner } from '../../src/security/DocumentSupportSigner';
import { AdjustmentNoteSigner } from '../../src/security/AdjustmentNoteSigner';
import { generateTestCertificate } from '../helpers/testCertificate';
import { ICertificateData } from '../../src/common/interfaces';
import { ALGO_SHA1, ALGO_SHA256, ALGO_SHA512 } from '../../src/security/BaseXmlSigner';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendNominaSync';
const TO = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl';

const NOMINA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"
                  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
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

const NOMINA_AJUSTE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividualDeAjuste xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"
                  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <InformacionGeneral FechaGen="2024-01-15" HoraGen="10:30:00-05:00" TipoXML="103" Ambiente="2" CUNE=""/>
  <NumeroSecuenciaXML Numero="NA001" Consecutivo="1"/>
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
</NominaIndividualDeAjuste>`;

const DOC_SUPPORT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="urn:dian:gov:co:facturaelectronica:Structures-2-1">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions/>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>DS-001</cbc:ID>
  <cbc:IssueDate>2024-06-15</cbc:IssueDate>
</Invoice>`;

const ADJUSTMENT_NOTE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
            xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
            xmlns:sts="http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions/>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>AN-001</cbc:ID>
  <cbc:IssueDate>2024-06-20</cbc:IssueDate>
</CreditNote>`;

let certData: ICertificateData;

beforeAll(() => {
  certData = generateTestCertificate();
});

// ---------------------------------------------------------------------------
// PayrollSigner — Firma completa de nómina individual
// ---------------------------------------------------------------------------

describe('PayrollSigner — Firma completa de NominaIndividual', () => {
  let signedXml: string;
  let signedDoc: Document;

  beforeAll(() => {
    const signer = new PayrollSigner();
    signedXml = signer.sign(NOMINA_XML, certData, ACTION, TO);
    signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');
  });

  it('debería producir un XML firmado más largo que el original', () => {
    expect(signedXml.length).toBeGreaterThan(NOMINA_XML.length);
  });

  it('debería contener ds:Signature', () => {
    const sigs = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    expect(sigs.length).toBe(1);
  });

  it('debería contener xades:QualifyingProperties', () => {
    const qp = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'QualifyingProperties');
    expect(qp.length).toBe(1);
  });

  it('debería contener X509Certificate con el cert del firmante', () => {
    const x509 = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate');
    expect(x509.length).toBe(1);
    expect(x509.item(0)!.textContent).toBe(certData.x509CertificateBase64);
  });

  it('el namespace final debe ser el original (sin urn:)', () => {
    expect(signedXml).toContain('xmlns="dian:gov:co:facturaelectronica:NominaIndividual"');
    expect(signedXml).not.toContain('xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"');
  });

  it('debería preservar datos del documento original', () => {
    expect(signedXml).toContain('900373115');
    expect(signedXml).toContain('1234567890');
    expect(signedXml).toContain('2500000.00');
  });

  it('debería contener SignatureValue válido (base64)', () => {
    const sigVal = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue');
    expect(sigVal.length).toBe(1);
    const decoded = Buffer.from(sigVal.item(0)!.textContent!, 'base64');
    expect(decoded.length).toBe(256); // RSA-2048
  });

  it('debería contener política de firma DIAN v2', () => {
    const identifier = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'Identifier');
    expect(identifier.length).toBe(1);
    expect(identifier.item(0)!.textContent)
      .toBe('https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf');
  });
});

// ---------------------------------------------------------------------------
// PayrollSigner — Firma completa de NominaIndividualDeAjuste
// ---------------------------------------------------------------------------

describe('PayrollSigner — Firma completa de NominaIndividualDeAjuste', () => {
  let signedXml: string;
  let signedDoc: Document;

  beforeAll(() => {
    const signer = new PayrollSigner();
    signedXml = signer.sign(NOMINA_AJUSTE_XML, certData, ACTION, TO);
    signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');
  });

  it('debería producir un XML firmado', () => {
    expect(signedXml.length).toBeGreaterThan(NOMINA_AJUSTE_XML.length);
  });

  it('debería contener ds:Signature', () => {
    const sigs = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    expect(sigs.length).toBe(1);
  });

  it('el namespace final debe ser el original de ajuste (sin urn:)', () => {
    expect(signedXml).toContain('xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"');
    expect(signedXml).not.toContain('xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"');
  });

  it('debería contener xades:SigningTime válido', () => {
    const signingTime = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'SigningTime');
    expect(signingTime.length).toBe(1);
    expect(new Date(signingTime.item(0)!.textContent!).getTime()).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// PayrollSigner — Diferencia con XmlSigner estándar
// ---------------------------------------------------------------------------

describe('PayrollSigner — Diferencia con firma UBL estándar', () => {
  it('el namespace transform pre-firma SOLO afecta a nómina', () => {
    const payrollSigner = new PayrollSigner();
    const invoiceXml = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID>1</cbc:ID></Invoice>';

    // No debe modificar Invoice XML (no tiene namespace de nómina)
    const result = (payrollSigner as any).preSigningTransform(invoiceXml);
    expect(result).toBe(invoiceXml);
  });

  it('firmas de nómina y nómina de ajuste deben ser independientes', () => {
    const signer1 = new PayrollSigner();
    const signer2 = new PayrollSigner();
    const signed1 = signer1.sign(NOMINA_XML, certData, ACTION, TO);
    const signed2 = signer2.sign(NOMINA_AJUSTE_XML, certData, ACTION, TO);

    // Deben tener namespaces diferentes
    expect(signed1).toContain('NominaIndividual');
    expect(signed2).toContain('NominaIndividualDeAjuste');
    expect(signed1).not.toContain('NominaIndividualDeAjuste');
  });
});

// ---------------------------------------------------------------------------
// DocumentSupportSigner — Firma completa
// ---------------------------------------------------------------------------

describe('DocumentSupportSigner — Firma completa', () => {
  let signedXml: string;
  let signedDoc: Document;

  beforeAll(() => {
    const signer = new DocumentSupportSigner();
    signedXml = signer.sign(DOC_SUPPORT_XML, certData, ACTION, TO);
    signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');
  });

  it('debería producir un XML firmado', () => {
    expect(signedXml.length).toBeGreaterThan(DOC_SUPPORT_XML.length);
  });

  it('debería contener ds:Signature', () => {
    const sigs = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    expect(sigs.length).toBe(1);
  });

  it('debería preservar datos del documento', () => {
    expect(signedXml).toContain('DS-001');
    expect(signedXml).toContain('2024-06-15');
  });

  it('debería contener xades:QualifyingProperties', () => {
    const qp = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'QualifyingProperties');
    expect(qp.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// AdjustmentNoteSigner — Firma completa
// ---------------------------------------------------------------------------

describe('AdjustmentNoteSigner — Firma completa', () => {
  let signedXml: string;
  let signedDoc: Document;

  beforeAll(() => {
    const signer = new AdjustmentNoteSigner();
    signedXml = signer.sign(ADJUSTMENT_NOTE_XML, certData, ACTION, TO);
    signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');
  });

  it('debería producir un XML firmado', () => {
    expect(signedXml.length).toBeGreaterThan(ADJUSTMENT_NOTE_XML.length);
  });

  it('debería contener ds:Signature', () => {
    const sigs = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    expect(sigs.length).toBe(1);
  });

  it('debería preservar datos del documento', () => {
    expect(signedXml).toContain('AN-001');
    expect(signedXml).toContain('2024-06-20');
  });
});

// ---------------------------------------------------------------------------
// Multi-algorithm — Firma con diferentes algoritmos
// ---------------------------------------------------------------------------

describe('Multi-algorithm — Firma con SHA1/SHA256/SHA512', () => {
  it('debería firmar con SHA256 por defecto', () => {
    const signer = new DocumentSupportSigner();
    const signedXml = signer.sign(DOC_SUPPORT_XML, certData, ACTION, TO);
    const doc = new DOMParser().parseFromString(signedXml, 'text/xml');

    const sigMethod = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureMethod');
    expect((sigMethod.item(0) as Element).getAttribute('Algorithm')).toContain('rsa-sha256');
  });

  it('debería firmar con SHA512 cuando se configura', () => {
    const signer = new DocumentSupportSigner();
    signer.setAlgorithm(ALGO_SHA512);
    const signedXml = signer.sign(DOC_SUPPORT_XML, certData, ACTION, TO);
    const doc = new DOMParser().parseFromString(signedXml, 'text/xml');

    const sigMethod = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureMethod');
    expect((sigMethod.item(0) as Element).getAttribute('Algorithm')).toContain('rsa-sha512');
  });

  it('SHA1 no debería ser soportado por xml-crypto v6 (rsa-sha1 deprecado)', () => {
    const signer = new DocumentSupportSigner();
    signer.setAlgorithm(ALGO_SHA1);
    expect(() => signer.sign(DOC_SUPPORT_XML, certData, ACTION, TO)).toThrow();
  });

  it('DigestMethod en XAdES CertDigest debe coincidir con el algoritmo', () => {
    const signer = new DocumentSupportSigner();
    signer.setAlgorithm(ALGO_SHA512);
    const signedXml = signer.sign(DOC_SUPPORT_XML, certData, ACTION, TO);
    const doc = new DOMParser().parseFromString(signedXml, 'text/xml');

    const certDigest = doc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'CertDigest');
    const digestMethod = (certDigest.item(0) as Element)
      .getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'DigestMethod');
    expect((digestMethod.item(0) as Element).getAttribute('Algorithm')).toContain('sha512');
  });

  it('firmas con diferentes algoritmos deben producir SignatureValue diferentes', () => {
    const signer256 = new DocumentSupportSigner();
    const signer512 = new DocumentSupportSigner();
    signer512.setAlgorithm(ALGO_SHA512);

    const signed256 = signer256.sign(DOC_SUPPORT_XML, certData, ACTION, TO);
    const signed512 = signer512.sign(DOC_SUPPORT_XML, certData, ACTION, TO);

    const doc256 = new DOMParser().parseFromString(signed256, 'text/xml');
    const doc512 = new DOMParser().parseFromString(signed512, 'text/xml');

    const sv256 = doc256.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue')
      .item(0)!.textContent;
    const sv512 = doc512.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue')
      .item(0)!.textContent;

    expect(sv256).not.toBe(sv512);
  });
});
