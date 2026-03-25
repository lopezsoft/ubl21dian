import * as forge from 'node-forge';
import { ICertificateData } from '../../src/common/interfaces';

/**
 * Genera un par de certificado/clave auto-firmado en memoria para tests.
 * NO usar en producción — solo para verificación de estructura de firmas.
 */
export function generateTestCertificate(): ICertificateData {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);

  const attrs = [
    { shortName: 'CN', value: 'Test DIAN SDK' },
    { shortName: 'O', value: 'Test Organization' },
    { shortName: 'C', value: 'CO' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const publicKeyPem = forge.pki.certificateToPem(cert);
  const x509CertificateBase64 = publicKeyPem
    .replace(/(-{5}(BEGIN|END) CERTIFICATE-{5}|\s)/g, '');

  return {
    privateKeyPem,
    publicKeyPem,
    x509CertificateBase64,
  };
}
