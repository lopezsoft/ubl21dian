import { DOMParser, XMLSerializer } from 'xmldom';
import * as crypto from 'crypto';
import { ExclusiveCanonicalization } from 'xml-crypto';
import * as fs from 'fs'; // Usamos fs directamente

// Asumiendo que estas interfaces y constantes están definidas correctamente en otra parte
import { ICertificateData } from "../common/interfaces";
import { ADDRESSING, BASE64BINARY, DIAN_COLOMBIA, EXC_C14N, RSA_SHA256, SHA256, SOAP_ENVELOPE, WSS_WSSECURITY, WSS_WSSECURITY_UTILITY, X509V3, XMLDSIG } from '../common/constants';
import { removeDomChild } from "../common/utils";

export class SoapSigner {
	private readonly ADDRESSING = ADDRESSING;
	private readonly SOAP_ENVELOPE = SOAP_ENVELOPE;
	private readonly DIAN_COLOMBIA = DIAN_COLOMBIA;
	private readonly XMLDSIG = XMLDSIG;
	private readonly WSS_WSSECURITY = WSS_WSSECURITY;
	private readonly WSS_WSSECURITY_UTILITY = WSS_WSSECURITY_UTILITY;
	private readonly EXC_C14N = EXC_C14N;
	private readonly RSA_SHA256 = RSA_SHA256;
	private readonly SHA256 = SHA256;
	private readonly X509V3 = X509V3;
	private readonly BASE64BINARY = BASE64BINARY;

	protected ids = {
		wsuBinarySecurityTokenID: 'X509',
		securityTokenReferenceID: 'STR',
		signatureID: 'SIG',
		timestampID: 'TS',
		keyInfoID: 'KI',
		wsuIDTo: 'id',
	};

	// Propiedades del DOM que se construirán
	private domDocument: any;
	private to: any;
	private reference1: any;
	private digestValue: any;
	private signature: any;
	private signatureValue: any;

	private certs: { pkey: string, x509CertificateBase64: string } = { pkey: '', x509CertificateBase64: '' };

	constructor() {
		this.generateUniqueIds();
	}

	private generateUniqueIds(): void {
		const idsMap = this.ids as any;
		for (const key in idsMap) {
			if (Object.prototype.hasOwnProperty.call(idsMap, key)) {
				const uniqueId = crypto.createHash('sha1').update(crypto.randomBytes(16)).digest('hex').toUpperCase();
				(this.ids as any)[key] = `${idsMap[key]}-${uniqueId}`;
			}
		}
	}

	public sign(unsignedSoap: string | any, certificateData: ICertificateData, action: string, toValue: string): string {
		this.certs.pkey = certificateData.privateKeyPem;
		this.certs.x509CertificateBase64 = certificateData.x509CertificateBase64;
		const parser = new DOMParser();
		const serializer = new XMLSerializer();
		const CurrentTime = Math.floor(Date.now() / 1000);

		if (unsignedSoap instanceof Object) {
			unsignedSoap = serializer.serializeToString(unsignedSoap);
		}

		this.domDocument = parser.parseFromString(unsignedSoap, 'text/xml');
		this.domDocument = removeDomChild(this.domDocument, 'Header');

		// --- Construcción del Header ---
		const header = this.domDocument.createElement('soap:Header');
		header.setAttribute('xmlns:wsa', this.ADDRESSING);
		this.domDocument.documentElement.insertBefore(header, this.domDocument.documentElement.firstChild);

		const security = this.domDocument.createElement('wsse:Security');
		security.setAttribute('xmlns:wsse', this.WSS_WSSECURITY);
		security.setAttribute('xmlns:wsu', this.WSS_WSSECURITY_UTILITY);
		header.appendChild(security);

		const actionElement = this.domDocument.createElement('wsa:Action');
		actionElement.textContent = action;
		header.appendChild(actionElement);

		this.to = this.domDocument.createElement('wsa:To');
		this.to.textContent = toValue;
		this.to.setAttribute('wsu:Id', this.ids.wsuIDTo);
		this.to.setAttribute('xmlns:wsu', this.WSS_WSSECURITY_UTILITY);
		header.appendChild(this.to);

		const timestamp = this.domDocument.createElement('wsu:Timestamp');
		timestamp.setAttribute('wsu:Id', this.ids.timestampID);
		security.appendChild(timestamp);

		const createdTime = new Date(CurrentTime * 1000).toISOString();
		const created = this.domDocument.createElement('wsu:Created');
		created.textContent = createdTime;
		timestamp.appendChild(created);

		const timeToLive = 60000;
		const expireTime = new Date((CurrentTime + timeToLive) * 1000).toISOString();
		const expire = this.domDocument.createElement('wsu:Expires');
		expire.textContent = expireTime;
		timestamp.appendChild(expire);

		const token = this.domDocument.createElement('wsse:BinarySecurityToken');
		token.textContent = certificateData.x509CertificateBase64;
		token.setAttribute('EncodingType', this.BASE64BINARY);
		token.setAttribute('ValueType', this.X509V3);
		token.setAttribute('wsu:Id', this.ids.wsuBinarySecurityTokenID);
		security.appendChild(token);

		// --- Construcción de la Firma (estructura principal) ---
		this.signature = this.domDocument.createElement('ds:Signature');
		this.signature.setAttribute('Id', this.ids.signatureID);
		this.signature.setAttribute('xmlns:ds', this.XMLDSIG);
		security.appendChild(this.signature);

		const signedInfo = this.domDocument.createElement('ds:SignedInfo');
		this.signature.appendChild(signedInfo);

		const canonicalizationMethod = this.domDocument.createElement('ds:CanonicalizationMethod');
		canonicalizationMethod.setAttribute('Algorithm', this.EXC_C14N);
		signedInfo.appendChild(canonicalizationMethod);

		const inclusiveNamespaces1 = this.domDocument.createElement('ec:InclusiveNamespaces');
		inclusiveNamespaces1.setAttribute('PrefixList', 'wsa soap wcf');
		inclusiveNamespaces1.setAttribute('xmlns:ec', this.EXC_C14N);
		canonicalizationMethod.appendChild(inclusiveNamespaces1);

		const signatureMethod = this.domDocument.createElement('ds:SignatureMethod');
		signatureMethod.setAttribute('Algorithm', this.RSA_SHA256);
		signedInfo.appendChild(signatureMethod);

		this.reference1 = this.domDocument.createElement('ds:Reference');
		this.reference1.setAttribute('URI', `#${this.ids.wsuIDTo}`);
		signedInfo.appendChild(this.reference1);

		const transforms = this.domDocument.createElement('ds:Transforms');
		this.reference1.appendChild(transforms);

		const transform = this.domDocument.createElement('ds:Transform');
		transform.setAttribute('Algorithm', this.EXC_C14N);
		transforms.appendChild(transform);

		const inclusiveNamespaces2 = this.domDocument.createElement('ec:InclusiveNamespaces');
		inclusiveNamespaces2.setAttribute('PrefixList', 'soap wcf');
		inclusiveNamespaces2.setAttribute('xmlns:ec', this.EXC_C14N);
		transform.appendChild(inclusiveNamespaces2);

		const digestMethod = this.domDocument.createElement('ds:DigestMethod');
		digestMethod.setAttribute('Algorithm', this.SHA256);
		this.reference1.appendChild(digestMethod);

		// --- Pasos Críticos de Firma ---
		this.createDigestValue(); // Crea y añade <ds:DigestValue>
		this.createSignature();   // Crea y añade <ds:SignatureValue>

		// --- Construcción del KeyInfo ---
		const keyInfo = this.domDocument.createElement('ds:KeyInfo');
		keyInfo.setAttribute('Id', this.ids.keyInfoID);
		this.signature.appendChild(keyInfo);

		const securityTokenReference = this.domDocument.createElement('wsse:SecurityTokenReference');
		securityTokenReference.setAttribute('wsu:Id', this.ids.securityTokenReferenceID);
		keyInfo.appendChild(securityTokenReference);

		const reference2 = this.domDocument.createElement('wsse:Reference');
		reference2.setAttribute('URI', `#${this.ids.wsuBinarySecurityTokenID}`);
		reference2.setAttribute('ValueType', this.X509V3);
		securityTokenReference.appendChild(reference2);

		return serializer.serializeToString(this.domDocument).trim();
	}

	/**
	 * @description Crea el valor del DigestValue construyendo el nodo manualmente
	 * para un control absoluto y evitar inconsistencias de serialización.
	 */
	public createDigestValue(): string {
		const parser = new DOMParser();

		// 1. Obtenemos los valores dinámicos que necesitamos del nodo <wsa:To> ya creado.
		const toId = this.to.getAttribute('wsu:Id');
		const toValue = this.to.textContent;

		// 2. Construimos el string del nodo desde cero, incluyendo TODOS los namespaces.
		const toNodeString =
			`<wsa:To xmlns:soap="${this.SOAP_ENVELOPE}" xmlns:wcf="${this.DIAN_COLOMBIA}" xmlns:wsa="${this.ADDRESSING}" xmlns:wsu="${this.WSS_WSSECURITY_UTILITY}" wsu:Id="${toId}">` +
			`${toValue}` +
			`</wsa:To>`;
		fs.writeFileSync('__NODEJS_C14N_OUTPUT_TO.xml', toNodeString, 'utf8');

		// 3. Parseamos este string perfecto en un documento temporal.
		const tempDoc = parser.parseFromString(toNodeString, 'text/xml');

		// 4. Canonicalizamos y generamos el hash.
		const options: any = {
			inclusiveNamespacesPrefixList: 'soap wcf'
		};
		const c14n = new ExclusiveCanonicalization();
		const canonicalizedXml = c14n.process(tempDoc.documentElement, options);

		// Guarda el resultado para verificar que AHORA SÍ CONTIENE TODOS LOS NAMESPACES
		fs.writeFileSync('__NODEJS_C14N_OUTPUT.xml', canonicalizedXml, 'utf8');

		const hash = crypto.createHash('sha256').update(canonicalizedXml, 'utf-8').digest();
		const digestValue = hash.toString('base64');

		// 5. Añadimos el DigestValue al documento principal.
		this.digestValue = this.domDocument.createElement('ds:DigestValue');
		this.digestValue.textContent = digestValue;
		this.reference1.appendChild(this.digestValue);

		return digestValue;
	}


	/**
	 * @description Crea la firma digital, replicando la C14N de PHP que
	 * inyecta los namespaces directamente en el nodo SignedInfo.
	 */
	public createSignature(): string {
		const serializer = new XMLSerializer();
		const parser = new DOMParser();

		// El nodo <SignedInfo> que construimos antes NO tiene los namespaces inyectados.
		const originalSignedInfoNode = this.signature.getElementsByTagName('ds:SignedInfo')[0];

		// 1. Serializamos el nodo <ds:SignedInfo> original.
		const originalSignedInfoString = serializer.serializeToString(originalSignedInfoNode);

		// 2. Construimos el string de namespaces que PHP inyecta.
		const namespacesToInject = `xmlns:ds="${this.XMLDSIG}" xmlns:wsa="${this.ADDRESSING}" xmlns:soap="${this.SOAP_ENVELOPE}" xmlns:wcf="${this.DIAN_COLOMBIA}"`;

		// 3. Replicamos el `str_replace` de PHP.
		const modifiedSignedInfoString = originalSignedInfoString.replace('<ds:SignedInfo', `<ds:SignedInfo ${namespacesToInject}`);

		// 4. Parseamos este string modificado en un documento temporal.
		const tempDoc = parser.parseFromString(modifiedSignedInfoString, 'text/xml');

		// 5. Canonicalizamos el documento temporal. Esta es la data que se firmará.
		const c14n = new ExclusiveCanonicalization();
		const canonicalizedXml = c14n.process(tempDoc.documentElement, {});

		// Guardamos el archivo canónico para compararlo con el `file-tmp-canoniza.xml` de PHP.
		fs.writeFileSync('file-tmp-canoniza-nodejs.xml', canonicalizedXml, 'utf8');

		// 6. Creamos la firma.
		const signer = crypto.createSign('RSA-SHA256');
		signer.update(canonicalizedXml);
		try {
			const signature = signer.sign(this.certs.pkey, 'base64');
			// 7. Añadimos el valor de la firma al documento principal.
			this.signatureValue = this.domDocument.createElement('ds:SignatureValue');
			this.signatureValue.textContent = signature;
			this.signature.appendChild(this.signatureValue);

			return signature;
		} catch (error) {
			console.error("Error al firmar el documento:", error);
			throw new Error("La firma digital no pudo ser generada.");
		}

	}
}