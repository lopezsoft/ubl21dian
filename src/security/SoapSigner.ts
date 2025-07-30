import { DOMParser, XMLSerializer } from 'xmldom';
import { SignedXml } from 'xml-crypto';
import { ICertificateData } from './Certificate';

/**
 * Maneja la firma de sobres SOAP utilizando el estándar WS-Security.
 */
export class SoapSigner {
	public sign(unsignedSoap: string, certificateData: ICertificateData): string {
		// 1. Parsear el sobre SOAP para poder manipularlo
		const doc = new DOMParser().parseFromString(unsignedSoap);
		const soapHeader = doc.getElementsByTagNameNS('http://www.w3.org/2003/05/soap-envelope', 'Header')[0];

		if (!soapHeader) {
			throw new Error('No se encontró el nodo <soap:Header> en el sobre SOAP.');
		}

		// 2. Crear e insertar el nodo de seguridad con Timestamp y Token
		const securityNode = this.createSecurityNode(doc, certificateData);
		soapHeader.appendChild(securityNode);

		// 3. Serializar el documento modificado de vuelta a string
		// Esto es necesario porque computeSignature espera una cadena de texto.
		const soapWithSecurityHeader = new XMLSerializer().serializeToString(doc);

		// 4. Crear y configurar la firma
		const signature = new SignedXml();
		signature.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
		signature.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
		(signature as any).signingKey = certificateData.privateKeyPem;

		// 5. Añadir referencias a los nodos que se deben firmar
		signature.addReference({
			xpath: "//*[local-name()='Timestamp']",
			digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
			transforms: ['http://www.w3.org/2001/10/xml-exc-c14n#'],
		});
		signature.addReference({
			xpath: "//*[local-name()='Body']",
			digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
			transforms: ['http://www.w3.org/2001/10/xml-exc-c14n#'],
		});

		// 6. Configurar el KeyInfo para que apunte al BinarySecurityToken
		(signature as any).keyInfoProvider = {
			getKeyInfo: () => `<wsse:SecurityTokenReference xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><wsse:Reference URI="#x509-binary-security-token" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/></wsse:SecurityTokenReference>`,
		};

		// 7. Calcular la firma, pasándole el XML como string
		signature.computeSignature(soapWithSecurityHeader, {
			prefix: 'ds',
			location: {
				reference: "//*[local-name()='Security']",
				action: 'prepend',
			},
		});

		// 8. Devolver el resultado final
		return signature.getSignedXml();
	}

	/**
	 * Construye el nodo <wsse:Security> con el Timestamp y el BinarySecurityToken.
	 */
	private createSecurityNode(doc: Document, certificateData: ICertificateData): Element {
		// (Este método no necesita cambios, está correcto)
		const now = new Date();
		// La DIAN a menudo requiere que la hora esté en UTC (Zulu time)
		const created = now.toISOString().split('.')[0] + 'Z';
		const expires = new Date(now.getTime() + 5 * 60 * 1000).toISOString().split('.')[0] + 'Z';

		const securityNode = doc.createElementNS('http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd', 'wsse:Security');
		securityNode.setAttribute('xmlns:wsu', 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd');
		securityNode.setAttribute('soap:mustUnderstand', '1');

		const timestampNode = doc.createElementNS('http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd', 'wsu:Timestamp');
		const createdNode = doc.createElementNS(timestampNode.namespaceURI!, 'wsu:Created');
		createdNode.textContent = created;
		const expiresNode = doc.createElementNS(timestampNode.namespaceURI!, 'wsu:Expires');
		expiresNode.textContent = expires;
		timestampNode.appendChild(createdNode);
		timestampNode.appendChild(expiresNode);
		securityNode.appendChild(timestampNode);

		const tokenNode = doc.createElementNS(securityNode.namespaceURI!, 'wsse:BinarySecurityToken');
		tokenNode.setAttribute('wsu:Id', 'x509-binary-security-token');
		tokenNode.setAttribute('EncodingType', 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary');
		tokenNode.setAttribute('ValueType', 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3');
		tokenNode.textContent = certificateData.x509CertificateBase64;
		securityNode.appendChild(tokenNode);

		return securityNode;
	}
}