import * as fs from 'fs/promises';
import * as forge from 'node-forge';

/**
 * Representa la información extraída de un certificado digital PKCS#12.
 */
export interface ICertificateData {
	/**
	 * La clave privada en formato PEM.
	 */
	privateKeyPem: string;
	/**
	 * La clave pública y la cadena de certificados en formato PEM.
	 */
	publicKeyPem: string;
	/**
	 * El certificado principal en formato Base64, sin cabeceras ni saltos de línea.
	 * Este formato es el requerido para el tag <ds:X509Certificate>.
	 */
	x509CertificateBase64: string;
}

/**
 * Maneja la lectura y el procesamiento de certificados digitales en formato P12.
 * Su responsabilidad es extraer la clave privada y el certificado público
 * necesarios para los procesos de firma.
 */
export class Certificate {
	private readonly p12Buffer: Buffer;
	private readonly password: string;

	/**
	 * Crea una instancia de la clase Certificate.
	 * @param p12Path La ruta al archivo .p12 del certificado digital.
	 * @param password La contraseña para abrir el archivo .p12.
	 */
	constructor(private readonly p12Path: string, password: string) {
		this.password = password;
		this.p12Buffer = Buffer.alloc(0); // Se inicializa vacío y se carga en `load`
	}

	/**
	 * Carga y procesa el certificado desde el sistema de archivos.
	 * Este método debe ser llamado antes de obtener los datos del certificado.
	 * @returns Una promesa que se resuelve en una instancia de ICertificateData.
	 */
	public async load(): Promise<ICertificateData> {
		try {
			const p12Buffer = await fs.readFile(this.p12Path);
			const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));

			const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, this.password);

			// Obtener la clave privada y el certificado
			const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
			const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

			if (Object.keys(keyBags).length === 0 || Object.keys(certBags).length === 0) {
				throw new Error('No se pudo encontrar la clave privada o el certificado en el archivo P12. Verifique la contraseña.');
			}

			const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]![0].key;
			const certificate = certBags[forge.pki.oids.certBag]![0].cert;

			if (!privateKey || !certificate) {
				throw new Error('El contenido del archivo P12 no es válido.');
			}

			const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
			const publicKeyPem = forge.pki.certificateToPem(certificate);

			// Extraer el contenido Base64 del certificado PEM
			const x509CertificateBase64 = publicKeyPem
				.replace('-----BEGIN CERTIFICATE-----', '')
				.replace('-----END CERTIFICATE-----', '')
				.replace(/\r\n/g, '');

			return {
				privateKeyPem,
				publicKeyPem,
				x509CertificateBase64,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('Invalid password')) {
				throw new Error('La contraseña del certificado es incorrecta.');
			}
			throw new Error(`Error al leer o procesar el certificado: ${(error as Error).message}`);
		}
	}
}