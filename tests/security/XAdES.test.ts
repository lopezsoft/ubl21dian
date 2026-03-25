import { DOMParser } from 'xmldom';
import { BaseXmlSigner } from '../../src/security/BaseXmlSigner';
import { XmlSigner } from '../../src/security/XmlSigner';
import { PayrollSigner } from '../../src/security/PayrollSigner';
import { AttachedDocumentSigner } from '../../src/security/AttachedDocumentSigner';
import { generateTestCertificate } from '../helpers/testCertificate';
import { ICertificateData } from '../../src/common/interfaces';
import { DocumentType, DOCUMENT_TYPE_CONFIG } from '../../src/ubl/models';

// ---------------------------------------------------------------------------
// Fixtures — XMLs mínimos con ExtensionContent para firmar
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
        <sts:DianExtensions/>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:ID>INV-001</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
</Invoice>`;

const CREDIT_NOTE_XML = INVOICE_XML
  .replace(/<Invoice /g, '<CreditNote ')
  .replace(/<\/Invoice>/g, '</CreditNote>')
  .replace('Invoice-2', 'CreditNote-2');

const PAYROLL_XML = `<?xml version="1.0" encoding="UTF-8"?>
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
  <InformacionGeneral FechaGen="2024-01-15" HoraGen="10:00:00-05:00" TipoXML="102" Ambiente="2"/>
</NominaIndividual>`;

const ATTACHED_DOC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2"
                  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                  xmlns:ccts="urn:un:unece:uncefact:data:specification:CoreComponentTypeSchemaModule:2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>AD-001</cbc:ID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
</AttachedDocument>`;

const ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync';
const TO = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl';

let certData: ICertificateData;

beforeAll(() => {
  certData = generateTestCertificate();
});

// ---------------------------------------------------------------------------
// Tests — XmlSigner (auto-detección de tipo de documento)
// ---------------------------------------------------------------------------

describe('XmlSigner — Auto-detección de tipo de documento', () => {
  it('debería detectar Invoice automáticamente', () => {
    const signer = new XmlSigner();
    // Pre-process to trigger auto-detection
    const result = (signer as any).preSigningTransform(INVOICE_XML);
    expect(signer.getDocumentConfig()?.type).toBe(DocumentType.Invoice);
    expect(result).toBe(INVOICE_XML);
  });

  it('debería detectar CreditNote automáticamente', () => {
    const signer = new XmlSigner();
    (signer as any).preSigningTransform(CREDIT_NOTE_XML);
    expect(signer.getDocumentConfig()?.type).toBe(DocumentType.CreditNote);
  });

  it('debería respetar setDocumentType explícito', () => {
    const signer = new XmlSigner();
    signer.setDocumentType(DocumentType.DocumentSupport);
    // Pre-process no debería sobreescribir
    (signer as any).preSigningTransform(INVOICE_XML);
    expect(signer.getDocumentConfig()?.type).toBe(DocumentType.DocumentSupport);
  });

  it('debería tener namespaces diferentes para cada tipo', () => {
    const invoiceSigner = new XmlSigner();
    invoiceSigner.setDocumentType(DocumentType.Invoice);

    const creditSigner = new XmlSigner();
    creditSigner.setDocumentType(DocumentType.CreditNote);

    expect(invoiceSigner.getDocumentConfig()?.ns['xmlns'])
      .not.toBe(creditSigner.getDocumentConfig()?.ns['xmlns']);
  });
});

// ---------------------------------------------------------------------------
// Tests — BaseXmlSigner estructura de firma XAdES
// ---------------------------------------------------------------------------

describe('BaseXmlSigner — Firma XAdES', () => {
  let signedXml: string;
  let signedDoc: Document;

  beforeAll(() => {
    const signer = new XmlSigner();
    signedXml = signer.sign(INVOICE_XML, certData, ACTION, TO);
    signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');
  });

  it('debería producir un documento XML firmado', () => {
    expect(signedXml).toBeTruthy();
    expect(signedXml.length).toBeGreaterThan(INVOICE_XML.length);
  });

  it('debería contener ds:Signature', () => {
    const signatures = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    expect(signatures.length).toBe(1);
  });

  it('debería contener ds:SignedInfo con referencia', () => {
    const signedInfo = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignedInfo');
    expect(signedInfo.length).toBe(1);

    const references = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Reference');
    expect(references.length).toBeGreaterThanOrEqual(1);
  });

  it('debería contener ds:SignatureValue no vacío', () => {
    const sigVal = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue');
    expect(sigVal.length).toBe(1);
    expect(sigVal.item(0)!.textContent!.length).toBeGreaterThan(0);
  });

  it('debería contener ds:KeyInfo con X509Certificate', () => {
    const keyInfo = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'KeyInfo');
    expect(keyInfo.length).toBe(1);

    const x509Cert = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate');
    expect(x509Cert.length).toBe(1);
    expect(x509Cert.item(0)!.textContent).toBe(certData.x509CertificateBase64);
  });

  it('debería contener xades:QualifyingProperties', () => {
    const qp = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'QualifyingProperties');
    expect(qp.length).toBe(1);
  });

  it('debería contener xades:SignedProperties con SigningTime', () => {
    const sp = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'SignedProperties');
    expect(sp.length).toBe(1);

    const signingTime = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'SigningTime');
    expect(signingTime.length).toBe(1);
    expect(new Date(signingTime.item(0)!.textContent!).getTime()).not.toBeNaN();
  });

  it('debería contener xades:SigningCertificate con CertDigest', () => {
    const certDigest = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'CertDigest');
    expect(certDigest.length).toBe(1);

    const digestValue = (certDigest.item(0) as Element)
      .getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'DigestValue');
    expect(digestValue.length).toBe(1);
    expect(digestValue.item(0)!.textContent!.length).toBeGreaterThan(0);
  });

  it('debería contener xades:IssuerSerial con IssuerName y SerialNumber', () => {
    const issuerSerial = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'IssuerSerial');
    expect(issuerSerial.length).toBe(1);

    const issuerName = (issuerSerial.item(0) as Element)
      .getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509IssuerName');
    expect(issuerName.length).toBe(1);
    expect(issuerName.item(0)!.textContent).toContain('CN=');

    const serialNumber = (issuerSerial.item(0) as Element)
      .getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509SerialNumber');
    expect(serialNumber.length).toBe(1);
    expect(serialNumber.item(0)!.textContent!.length).toBeGreaterThan(0);
  });

  it('debería contener xades:SignaturePolicyIdentifier con la política DIAN v2', () => {
    const policyId = signedDoc.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'SigPolicyId');
    expect(policyId.length).toBe(1);

    const identifier = (policyId.item(0) as Element)
      .getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'Identifier');
    expect(identifier.length).toBe(1);
    expect(identifier.item(0)!.textContent)
      .toBe('https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf');
  });

  it('debería preservar los datos del documento original', () => {
    expect(signedXml).toContain('INV-001');
    expect(signedXml).toContain('2024-01-15');
  });
});

// ---------------------------------------------------------------------------
// Tests — PayrollSigner (transformación de namespaces)
// ---------------------------------------------------------------------------

describe('PayrollSigner — Transformación de namespaces', () => {
  it('debería transformar namespace dian:gov:co → urn:dian:gov:co antes de firmar', () => {
    const signer = new PayrollSigner();
    const transformed = (signer as any).preSigningTransform(PAYROLL_XML);
    expect(transformed).not.toContain('xmlns="dian:gov:co:facturaelectronica:NominaIndividual"');
    expect(transformed).toContain('xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"');
  });

  it('debería restaurar namespace urn:dian:gov:co → dian:gov:co después de firmar', () => {
    const signer = new PayrollSigner();
    const restored = (signer as any).postSigningTransform(
      '<NominaIndividual xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual">data</NominaIndividual>',
    );
    expect(restored).toContain('xmlns="dian:gov:co:facturaelectronica:NominaIndividual"');
    expect(restored).not.toContain('urn:dian:gov:co');
  });

  it('debería manejar NominaIndividualDeAjuste', () => {
    const signer = new PayrollSigner();
    const adjustmentXml = PAYROLL_XML
      .replace(/xmlns="dian:gov:co:facturaelectronica:NominaIndividual"/g,
        'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"')
      .replace(/<NominaIndividual /g, '<NominaIndividualDeAjuste ')
      .replace(/<\/NominaIndividual>/g, '</NominaIndividualDeAjuste>');

    const transformed = (signer as any).preSigningTransform(adjustmentXml);
    expect(transformed).toContain('urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste');

    const restored = (signer as any).postSigningTransform(transformed);
    expect(restored).toContain('xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"');
  });

  it('debería producir un documento firmado con namespace original restaurado', () => {
    const signer = new PayrollSigner();
    const signedXml = signer.sign(PAYROLL_XML, certData, ACTION, TO);
    // El namespace final debe ser el original sin 'urn:'
    expect(signedXml).toContain('dian:gov:co:facturaelectronica:NominaIndividual');
    expect(signedXml).not.toContain('urn:dian:gov:co:facturaelectronica:NominaIndividual');
  });
});

// ---------------------------------------------------------------------------
// Tests — AttachedDocumentSigner
// ---------------------------------------------------------------------------

describe('AttachedDocumentSigner — ExtensionContent index', () => {
  it('debería usar getExtensionContentIndex() = 0', () => {
    const signer = new AttachedDocumentSigner();
    const index = (signer as any).getExtensionContentIndex();
    expect(index).toBe(0);
  });

  it('debería tener configuración de AttachedDocument', () => {
    const signer = new AttachedDocumentSigner();
    const config = signer.getDocumentConfig();
    expect(config.type).toBe(DocumentType.AttachedDocument);
    expect(config.ns['xmlns']).toBe('urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2');
    expect(config.ns['xmlns:ccts']).toBeDefined();
  });

  it('debería firmar un AttachedDocument insertando firma en ExtensionContent[0]', () => {
    const signer = new AttachedDocumentSigner();
    const signedXml = signer.sign(ATTACHED_DOC_XML, certData, ACTION, TO);
    const signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');

    // Verificar que hay firma
    const signatures = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
    expect(signatures.length).toBe(1);

    // Verificar datos preservados
    expect(signedXml).toContain('AD-001');
  });
});

// ---------------------------------------------------------------------------
// Tests — BaseXmlSigner getExtensionContentIndex por defecto
// ---------------------------------------------------------------------------

describe('BaseXmlSigner — ExtensionContent index por defecto', () => {
  it('XmlSigner (estándar) debería usar index 1', () => {
    const signer = new XmlSigner();
    const index = (signer as any).getExtensionContentIndex();
    expect(index).toBe(1);
  });

  it('PayrollSigner debería usar index 1 (por defecto)', () => {
    const signer = new PayrollSigner();
    const index = (signer as any).getExtensionContentIndex();
    expect(index).toBe(1);
  });

  it('AttachedDocumentSigner debería usar index 0', () => {
    const signer = new AttachedDocumentSigner();
    const index = (signer as any).getExtensionContentIndex();
    expect(index).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — Firma produce XMLs deterministas con misma clave
// ---------------------------------------------------------------------------

describe('BaseXmlSigner — Consistencia de firma', () => {
  it('la firma del mismo documento con la misma clave debería producir SignatureValue válido', () => {
    const signer = new XmlSigner();
    const signedXml = signer.sign(INVOICE_XML, certData, ACTION, TO);
    const doc = new DOMParser().parseFromString(signedXml, 'text/xml');

    const sigVal = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue');
    const value = sigVal.item(0)!.textContent!;
    // La firma RSA-SHA256 con 2048 bits: 256 bytes decodificados
    expect(Buffer.from(value, 'base64').length).toBe(256);
  });

  it('los IDs de firma deberían ser únicos entre invocaciones', () => {
    const signer1 = new XmlSigner();
    const signer2 = new XmlSigner();
    const signed1 = signer1.sign(INVOICE_XML, certData, ACTION, TO);
    const signed2 = signer2.sign(INVOICE_XML, certData, ACTION, TO);

    const doc1 = new DOMParser().parseFromString(signed1, 'text/xml');
    const doc2 = new DOMParser().parseFromString(signed2, 'text/xml');

    const sp1 = doc1.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'SignedProperties')
      .item(0) as Element;
    const sp2 = doc2.getElementsByTagNameNS('http://uri.etsi.org/01903/v1.3.2#', 'SignedProperties')
      .item(0) as Element;

    expect(sp1.getAttribute('Id')).not.toBe(sp2.getAttribute('Id'));
  });
});
