import { DOMParser, XMLSerializer } from 'xmldom';
import { SignedXml } from 'xml-crypto';
import * as forge from 'node-forge';
import {ICertificateData, ISigner} from '../common/interfaces';

/**
 * Clase base abstracta para la firma de documentos XML (UBL).
 * Utiliza el patrón Template Method para definir el esqueleto del algoritmo de firma,
 * permitiendo que las subclases redefinan pasos específicos sin cambiar la estructura.
 */
export abstract class BaseXmlSigner implements ISigner {
	/**
	 * El "Template Method" principal. Orquesta el proceso de firma.
	 */
	public sign(xml: string | any, certificateData: ICertificateData, action: string, toValue: string): string {
		const preProcessedXml = this.preSigningTransform(xml);

		const signature = new SignedXml();
		this.configureSignature(signature, certificateData);

		signature.computeSignature(preProcessedXml, {
			prefix: 'ds',
			location: {
				reference: "//*[local-name()='ExtensionContent'][1]",
				action: 'append',
			},
		});

		const signedXmlString = signature.getSignedXml();
		const signedDoc = new DOMParser().parseFromString(signedXmlString);
		const signatureNode = signedDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0];

		if (!signatureNode) {
			throw new Error('No se pudo encontrar el nodo de la firma en el XML resultante.');
		}

		this.injectKeyInfo(signatureNode, certificateData);
		this.addXAdESObject(signatureNode, certificateData);

		const finalXml = new XMLSerializer().serializeToString(signedDoc);
		return this.postSigningTransform(finalXml);
	}

	/**
	 * Hook para transformaciones ANTES de la firma. Las subclases pueden sobreescribirlo.
	 */
	protected preSigningTransform(xml: string): string {
		return xml; // Por defecto, no hace nada
	}

	/**
	 * Hook para transformaciones DESPUÉS de la firma. Las subclases pueden sobreescribirlo.
	 */
	protected postSigningTransform(xml: string): string {
		return xml; // Por defecto, no hace nada
	}

	// Métodos privados y comunes del algoritmo de firma
	private configureSignature(signature: SignedXml, certificateData: ICertificateData): void {
		signature.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
		signature.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
		(signature as any).signingKey = certificateData.privateKeyPem;

		signature.addReference({
			xpath: "/*",
			digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
			transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'],
		});
	}

	private injectKeyInfo(signatureNode: Node, certData: ICertificateData): void {
		const keyInfoString = `<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>${certData.x509CertificateBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`;
		const keyInfoNode = new DOMParser().parseFromString(keyInfoString).documentElement;
		signatureNode.appendChild(keyInfoNode);
	}

	private addXAdESObject(signatureNode: Node, certData: ICertificateData): void {
		const cert = forge.pki.certificateFromPem(certData.publicKeyPem);
		const certDigest = forge.util.encode64(forge.pki.getPublicKeyFingerprint(cert.publicKey, {
			md: forge.md.sha256.create(),
			encoding: 'binary'
		}));

		const xadesFragmentString = this.buildXadesObjectString(signatureNode, cert, certDigest);
		const xadesObjectNode = new DOMParser().parseFromString(xadesFragmentString).documentElement;
		signatureNode.appendChild(xadesObjectNode);
	}

	private buildXadesObjectString(signatureNode: Node, cert: forge.pki.Certificate, certDigest: string): string {
		const issuerName = this.formatIssuerName(cert.issuer.attributes);
		const serialNumber = cert.serialNumber;
		const signatureId = (signatureNode as Element).getAttribute('Id') || `xmldsig-signature-${this.generateId()}`;
		const signedPropertiesId = `xmldsig-signedprops-${this.generateId()}`;

		const policyIdentifier = 'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf';
		const policyHash = 'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=';
		const signingTime = new Date().toISOString();

		return `
      <ds:Object xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
        <xades:QualifyingProperties Target="#${signatureId}">
          <xades:SignedProperties Id="${signedPropertiesId}">
            <xades:SignedSignatureProperties>
              <xades:SigningTime>${signingTime}</xades:SigningTime>
              <xades:SigningCertificate>
                <xades:Cert>
                  <xades:CertDigest>
                    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                    <ds:DigestValue>${certDigest}</ds:DigestValue>
                  </xades:CertDigest>
                  <xades:IssuerSerial>
                    <ds:X509IssuerName>${issuerName}</ds:X509IssuerName>
                    <ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>
                  </xades:IssuerSerial>
                </xades:Cert>
              </xades:SigningCertificate>
              <xades:SignaturePolicyIdentifier>
                <xades:SignaturePolicyId>
                  <xades:SigPolicyId>
                    <xades:Identifier>${policyIdentifier}</xades:Identifier>
                  </xades:SigPolicyId>
                  <xades:SigPolicyHash>
                    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                    <ds:DigestValue>${policyHash}</ds:DigestValue>
                  </xades:SigPolicyHash>
                </xades:SignaturePolicyId>
              </xades:SignaturePolicyIdentifier>
            </xades:SignedSignatureProperties>
          </xades:SignedProperties>
        </xades:QualifyingProperties>
      </ds:Object>`;
	}

	private formatIssuerName(attributes: any[]): string {
		const nameMap: { [key: string]: string } = { C: 'C', O: 'O', OU: 'OU', CN: 'CN', ST: 'ST', L: 'L' };
		return attributes.reverse().map(attr => `${nameMap[attr.shortName] || attr.shortName}=${attr.value}`).join(',');
	}

	private generateId(): string {
		return Math.random().toString(36).substring(2, 11);
	}
}