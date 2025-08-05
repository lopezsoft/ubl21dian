import * as fs from 'fs/promises';
import * as forge from 'node-forge';
import {ICertificateData} from "../common/interfaces";

export class Certificate {
	private logger = console;
	public async loadFromBuffer(p12Buffer: Buffer, password: string): Promise<ICertificateData> {
		try {
			this.logger.log('Cargando certificado desde el buffer...');
			const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
			const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

			let privateKey: forge.pki.PrivateKey | null = null;
			let certificate: forge.pki.Certificate | null = null;

			const certBags = p12.getBags({ bagType: forge.pki.oids.certBag }) as any;
			const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag }) as any;

			if (!certBags || certBags[forge.pki.oids.certBag].length === 0) {
				throw new Error('No se pudo encontrar un certificado público en el archivo .p12.');
			}
			if (!keyBags || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
				throw new Error('No se pudo encontrar una llave privada en el archivo .p12.');
			}

			const certs = certBags[forge.pki.oids.certBag].map(bag => bag.cert);
			const pkeys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].map(bag => bag.key);

			for (const cert of certs) {
				for (const pkey of pkeys) {
					// Compara los módulos de la clave y el certificado
					if (cert.publicKey.n.equals((pkey as any).n)) {
						privateKey = pkey as forge.pki.PrivateKey;
						certificate = cert;
						break;
					}
				}
				if (privateKey && certificate) {
					break;
				}
			}

			if (!privateKey || !certificate) {
				throw new Error('No se encontró un par de clave/certificado válido en el archivo .p12.');
			}

			const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
			const publicKeyPem = forge.pki.certificateToPem(certificate);
			const x509CertificateBase64 = publicKeyPem
				.replace(/(-{5}(BEGIN|END) CERTIFICATE-{5}|\s)/g, '');

			return {
				privateKeyPem,
				publicKeyPem,
				x509CertificateBase64,
			};
		} catch (error) {
			const errorMessage = (error instanceof Error) ? error.message : String(error);
			if (errorMessage.includes('mac check failed')) {
				throw new Error(`La contraseña del certificado es incorrecta. Error original: ${errorMessage}`);
			}
			throw new Error(`Error crítico al procesar el certificado: ${errorMessage}`);
		}
	}

	public async loadFromFile(p12Path: string, password: string): Promise<ICertificateData> {
		const p12Buffer = await fs.readFile(p12Path);
		return this.loadFromBuffer(p12Buffer, password);
	}
}