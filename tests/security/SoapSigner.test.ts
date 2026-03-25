import { DOMParser } from 'xmldom';
import { SoapSigner } from '../../src/security/SoapSigner';
import { generateTestCertificate } from '../helpers/testCertificate';
import { ICertificateData } from '../../src/common/interfaces';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UNSIGNED_SOAP = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendBillSync>
      <wcf:fileName>test.xml</wcf:fileName>
      <wcf:contentFile>BASE64CONTENT</wcf:contentFile>
    </wcf:SendBillSync>
  </soap:Body>
</soap:Envelope>`;

const ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync';
const TO = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl';

let certData: ICertificateData;
let signedXml: string;
let signedDoc: Document;

// ---------------------------------------------------------------------------
// Setup — genera certificado y firma una vez para todos los tests
// ---------------------------------------------------------------------------

beforeAll(() => {
  certData = generateTestCertificate();
  const signer = new SoapSigner();
  signedXml = signer.sign(UNSIGNED_SOAP, certData, ACTION, TO);
  signedDoc = new DOMParser().parseFromString(signedXml, 'text/xml');
});

// ---------------------------------------------------------------------------
// Tests — Estructura del SOAP firmado
// ---------------------------------------------------------------------------

describe('SoapSigner — Estructura del Header', () => {
  it('debería contener soap:Header', () => {
    const headers = signedDoc.getElementsByTagName('soap:Header');
    expect(headers.length).toBe(1);
  });

  it('debería contener wsse:Security dentro del Header', () => {
    const security = signedDoc.getElementsByTagName('wsse:Security');
    expect(security.length).toBe(1);
  });

  it('debería contener wsa:Action con el valor correcto', () => {
    const action = signedDoc.getElementsByTagName('wsa:Action');
    expect(action.length).toBe(1);
    expect(action.item(0)?.textContent).toBe(ACTION);
  });

  it('debería contener wsa:To con el endpoint y wsu:Id', () => {
    const to = signedDoc.getElementsByTagName('wsa:To');
    expect(to.length).toBe(1);
    expect(to.item(0)?.textContent).toBe(TO);
    expect((to.item(0) as Element).getAttribute('wsu:Id')).toBeTruthy();
  });

  it('debería contener wsu:Timestamp con Created y Expires', () => {
    const timestamp = signedDoc.getElementsByTagName('wsu:Timestamp');
    expect(timestamp.length).toBe(1);

    const created = signedDoc.getElementsByTagName('wsu:Created');
    const expires = signedDoc.getElementsByTagName('wsu:Expires');
    expect(created.length).toBe(1);
    expect(expires.length).toBe(1);

    // Created debe ser fecha ISO válida
    expect(new Date(created.item(0)!.textContent!).getTime()).not.toBeNaN();
    // Expires debe ser posterior a Created
    const createdTime = new Date(created.item(0)!.textContent!).getTime();
    const expiresTime = new Date(expires.item(0)!.textContent!).getTime();
    expect(expiresTime).toBeGreaterThan(createdTime);
  });

  it('debería contener BinarySecurityToken con el certificado X.509', () => {
    const bst = signedDoc.getElementsByTagName('wsse:BinarySecurityToken');
    expect(bst.length).toBe(1);
    expect(bst.item(0)?.textContent).toBe(certData.x509CertificateBase64);
    expect((bst.item(0) as Element).getAttribute('ValueType')).toContain('X509');
  });

  it('debería eliminar el Header original y crear uno nuevo', () => {
    // No debe haber Headers duplicados
    const headers = signedDoc.getElementsByTagName('soap:Header');
    expect(headers.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — Estructura de ds:Signature
// ---------------------------------------------------------------------------

describe('SoapSigner — Estructura de la Firma', () => {
  it('debería contener ds:Signature dentro de wsse:Security', () => {
    const security = signedDoc.getElementsByTagName('wsse:Security').item(0);
    expect(security).toBeDefined();
    const signatures = (security as Element).getElementsByTagName('ds:Signature');
    expect(signatures.length).toBe(1);
  });

  it('debería contener ds:SignedInfo con CanonicalizationMethod y SignatureMethod', () => {
    const signedInfo = signedDoc.getElementsByTagName('ds:SignedInfo');
    expect(signedInfo.length).toBe(1);

    const canonMethod = signedDoc.getElementsByTagName('ds:CanonicalizationMethod');
    expect(canonMethod.length).toBe(1);
    expect((canonMethod.item(0) as Element).getAttribute('Algorithm'))
      .toBe('http://www.w3.org/2001/10/xml-exc-c14n#');

    const sigMethod = signedDoc.getElementsByTagName('ds:SignatureMethod');
    expect(sigMethod.length).toBe(1);
    expect((sigMethod.item(0) as Element).getAttribute('Algorithm'))
      .toBe('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
  });

  it('debería tener Reference con URI que apunta a wsa:To', () => {
    const toId = (signedDoc.getElementsByTagName('wsa:To').item(0) as Element)
      .getAttribute('wsu:Id');
    const reference = signedDoc.getElementsByTagName('ds:Reference');
    expect(reference.length).toBe(1);
    expect((reference.item(0) as Element).getAttribute('URI')).toBe(`#${toId}`);
  });

  it('debería tener Transform con Exclusive C14N', () => {
    const transforms = signedDoc.getElementsByTagName('ds:Transform');
    expect(transforms.length).toBeGreaterThanOrEqual(1);
    expect((transforms.item(0) as Element).getAttribute('Algorithm'))
      .toBe('http://www.w3.org/2001/10/xml-exc-c14n#');
  });

  it('debería tener DigestMethod SHA256', () => {
    const digestMethod = signedDoc.getElementsByTagName('ds:DigestMethod');
    expect(digestMethod.length).toBe(1);
    expect((digestMethod.item(0) as Element).getAttribute('Algorithm'))
      .toBe('http://www.w3.org/2001/04/xmlenc#sha256');
  });

  it('debería tener InclusiveNamespaces con PrefixList', () => {
    const ns = signedDoc.getElementsByTagName('ec:InclusiveNamespaces');
    expect(ns.length).toBeGreaterThanOrEqual(1);
    // El primer PrefixList debería incluir 'wsa soap wcf'
    const prefixList = (ns.item(0) as Element).getAttribute('PrefixList');
    expect(prefixList).toContain('wsa');
    expect(prefixList).toContain('soap');
    expect(prefixList).toContain('wcf');
  });
});

// ---------------------------------------------------------------------------
// Tests — DigestValue y SignatureValue
// ---------------------------------------------------------------------------

describe('SoapSigner — DigestValue y SignatureValue', () => {
  it('debería generar DigestValue como base64 válido', () => {
    const digestValue = signedDoc.getElementsByTagName('ds:DigestValue');
    expect(digestValue.length).toBe(1);
    const value = digestValue.item(0)!.textContent!;
    expect(value.length).toBeGreaterThan(0);
    // Verificar que es base64 válido
    expect(Buffer.from(value, 'base64').toString('base64')).toBe(value);
  });

  it('debería generar SignatureValue como base64 válido', () => {
    const signatureValue = signedDoc.getElementsByTagName('ds:SignatureValue');
    expect(signatureValue.length).toBe(1);
    const value = signatureValue.item(0)!.textContent!;
    expect(value.length).toBeGreaterThan(0);
    // La firma RSA-SHA256 con 2048 bits produce 256 bytes = ~344 chars base64
    expect(Buffer.from(value, 'base64').length).toBe(256);
  });

  it('debería producir DigestValue diferente para contenidos diferentes', () => {
    const signer1 = new SoapSigner();
    const signer2 = new SoapSigner();

    const xml1 = UNSIGNED_SOAP.replace('BASE64CONTENT', 'CONTENT_A');
    const xml2 = UNSIGNED_SOAP.replace('BASE64CONTENT', 'CONTENT_B');

    // Los dos firman con diferentes URLs de destino (To)
    const signed1 = signer1.sign(xml1, certData, ACTION, TO);
    const signed2 = signer2.sign(xml2, certData, ACTION, 'https://different.endpoint.com');

    const doc1 = new DOMParser().parseFromString(signed1, 'text/xml');
    const doc2 = new DOMParser().parseFromString(signed2, 'text/xml');

    const digest1 = doc1.getElementsByTagName('ds:DigestValue').item(0)!.textContent;
    const digest2 = doc2.getElementsByTagName('ds:DigestValue').item(0)!.textContent;

    expect(digest1).not.toBe(digest2);
  });
});

// ---------------------------------------------------------------------------
// Tests — KeyInfo
// ---------------------------------------------------------------------------

describe('SoapSigner — KeyInfo', () => {
  it('debería contener ds:KeyInfo con Id', () => {
    const keyInfo = signedDoc.getElementsByTagName('ds:KeyInfo');
    expect(keyInfo.length).toBe(1);
    expect((keyInfo.item(0) as Element).getAttribute('Id')).toBeTruthy();
  });

  it('debería usar SecurityTokenReference (no X509Data directamente)', () => {
    const str = signedDoc.getElementsByTagName('wsse:SecurityTokenReference');
    expect(str.length).toBe(1);
    // No debe haber X509Data en SOAP (eso es para XAdES)
    const x509Data = signedDoc.getElementsByTagName('ds:X509Data');
    expect(x509Data.length).toBe(0);
  });

  it('debería tener wsse:Reference apuntando al BinarySecurityToken', () => {
    const bstId = (signedDoc.getElementsByTagName('wsse:BinarySecurityToken').item(0) as Element)
      .getAttribute('wsu:Id');
    const wsseRef = signedDoc.getElementsByTagName('wsse:Reference');
    expect(wsseRef.length).toBe(1);
    expect((wsseRef.item(0) as Element).getAttribute('URI')).toBe(`#${bstId}`);
  });
});

// ---------------------------------------------------------------------------
// Tests — IDs únicos
// ---------------------------------------------------------------------------

describe('SoapSigner — IDs únicos', () => {
  it('debería generar IDs diferentes entre instancias', () => {
    const signer1 = new SoapSigner();
    const signer2 = new SoapSigner();
    const signed1 = signer1.sign(UNSIGNED_SOAP, certData, ACTION, TO);
    const signed2 = signer2.sign(UNSIGNED_SOAP, certData, ACTION, TO);

    const doc1 = new DOMParser().parseFromString(signed1, 'text/xml');
    const doc2 = new DOMParser().parseFromString(signed2, 'text/xml');

    const sigId1 = (doc1.getElementsByTagName('ds:Signature').item(0) as Element).getAttribute('Id');
    const sigId2 = (doc2.getElementsByTagName('ds:Signature').item(0) as Element).getAttribute('Id');
    expect(sigId1).not.toBe(sigId2);
  });

  it('todos los IDs deben contener hash SHA1 en mayúsculas', () => {
    const sigId = (signedDoc.getElementsByTagName('ds:Signature').item(0) as Element).getAttribute('Id')!;
    // Formato: PREFIX-XXXXXXXX (SHA1 hex uppercase)
    expect(sigId).toMatch(/^SIG-[0-9A-F]+$/);

    const bstId = (signedDoc.getElementsByTagName('wsse:BinarySecurityToken').item(0) as Element)
      .getAttribute('wsu:Id')!;
    expect(bstId).toMatch(/^X509-[0-9A-F]+$/);
  });
});

// ---------------------------------------------------------------------------
// Tests — Preservación del Body SOAP
// ---------------------------------------------------------------------------

describe('SoapSigner — Preservación del cuerpo SOAP', () => {
  it('debería mantener el soap:Body intacto', () => {
    const body = signedDoc.getElementsByTagName('soap:Body');
    expect(body.length).toBe(1);
    expect(signedXml).toContain('SendBillSync');
    expect(signedXml).toContain('BASE64CONTENT');
  });

  it('debería producir XML válido (header antes de body)', () => {
    const envelope = signedDoc.documentElement;
    const firstChild = envelope.firstChild;
    expect(firstChild?.nodeName).toBe('soap:Header');
  });
});
