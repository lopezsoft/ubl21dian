import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import * as forge from 'node-forge';
import { ICertificateData, ISigner } from '../common/interfaces';

/**
 * Configuración de algoritmo de firma soportados por la DIAN.
 * Replica las constantes ALGO_SHA1, ALGO_SHA256 y ALGO_SHA512 del PHP.
 */
export interface ISignatureAlgorithm {
	rsa: string;
	digest: string;
	hash: string;
}

export const ALGO_SHA1: ISignatureAlgorithm = {
	rsa: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha1',
	digest: 'http://www.w3.org/2001/04/xmlenc#sha1',
	hash: 'sha1',
};

export const ALGO_SHA256: ISignatureAlgorithm = {
	rsa: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
	digest: 'http://www.w3.org/2001/04/xmlenc#sha256',
	hash: 'sha256',
};

export const ALGO_SHA512: ISignatureAlgorithm = {
	rsa: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
	digest: 'http://www.w3.org/2001/04/xmlenc#sha512',
	hash: 'sha512',
};

/**
 * Clase base abstracta para la firma de documentos XML (UBL).
 * Utiliza el patrón Template Method para definir el esqueleto del algoritmo de firma,
 * permitiendo que las subclases redefinan pasos específicos sin cambiar la estructura.
 */
export abstract class BaseXmlSigner implements ISigner {
	protected algorithm: ISignatureAlgorithm = ALGO_SHA256;

	/**
	 * Permite configurar el algoritmo de firma (SHA1, SHA256, SHA512).
	 * Por defecto se usa SHA256 (el más común para DIAN).
	 */
	public setAlgorithm(algorithm: ISignatureAlgorithm): void {
		this.algorithm = algorithm;
	}

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
				reference: `(//*[local-name()='ExtensionContent'])[${this.getExtensionContentIndex() + 1}]`,
				action: 'append',
			},
		});

		const signedXmlString = signature.getSignedXml();
		const signedDoc = new DOMParser().parseFromString(signedXmlString, 'text/xml');
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

	/**
	 * Hook que define el índice de ExtensionContent donde insertar la firma.
	 * - UBL estándar (Invoice, CreditNote, DebitNote): índice 1
	 * - AttachedDocument: índice 0
	 * - DocumentSupport con Minsalud: índice 2
	 *
	 * Las subclases pueden sobreescribirlo según las reglas del tipo de documento.
	 */
	protected getExtensionContentIndex(): number {
		return 1;
	}

	// Métodos privados y comunes del algoritmo de firma
	private configureSignature(signature: SignedXml, certificateData: ICertificateData): void {
		signature.signatureAlgorithm = this.algorithm.rsa;
		// PHP usa C14N estándar para XAdES (no Exc-C14N que se reserva para SOAP)
		signature.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
		signature.privateKey = certificateData.privateKeyPem;

		signature.addReference({
			xpath: "/*",
			digestAlgorithm: this.algorithm.digest,
			transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],
		});
	}

	private injectKeyInfo(signatureNode: any, certData: ICertificateData): void {
		const keyInfoString = `<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>${certData.x509CertificateBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`;
		const keyInfoNode = new DOMParser().parseFromString(keyInfoString, 'text/xml').documentElement!;
		signatureNode.appendChild(keyInfoNode);
	}

	private addXAdESObject(signatureNode: any, certData: ICertificateData): void {
		const cert = forge.pki.certificateFromPem(certData.publicKeyPem);
		const md = this.algorithm.hash === 'sha512' ? forge.md.sha512.create()
			: this.algorithm.hash === 'sha1' ? forge.md.sha1.create()
				: forge.md.sha256.create();
		const certDigest = forge.util.encode64(forge.pki.getPublicKeyFingerprint(cert.publicKey, {
			md,
			encoding: 'binary'
		}));

		const xadesFragmentString = this.buildXadesObjectString(signatureNode, cert, certDigest);
		const xadesObjectNode = new DOMParser().parseFromString(xadesFragmentString, 'text/xml').documentElement!;
		signatureNode.appendChild(xadesObjectNode);
	}

	private buildXadesObjectString(signatureNode: any, cert: forge.pki.Certificate, certDigest: string): string {
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
                    <ds:DigestMethod Algorithm="${this.algorithm.digest}"/>
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
                    <ds:DigestMethod Algorithm="${this.algorithm.digest}"/>
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