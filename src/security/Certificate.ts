import * as fs from 'fs/promises';
import * as forge from 'node-forge';
import {ICertificateData} from "../common/interfaces";



/**
 * Maneja la lectura y el procesamiento de certificados digitales en formato P12.
 * Su responsabilidad es extraer la clave privada y el certificado público
 * necesarios para los procesos de firma.
 */
export class Certificate {
	/**
	 * Carga y procesa el certificado desde un Buffer.
	 * Este es el método principal que la API de NestJS usará.
	 * @param p12Buffer El contenido del archivo .p12 como un Buffer.
	 * @param password La contraseña para abrir el archivo.
	 */
	public async loadFromBuffer(p12Buffer: Buffer, password: string): Promise<ICertificateData> {
		try {
			const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
			const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

			const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
			const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

			const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
			const certificate = certBags[forge.pki.oids.certBag]?.[0]?.cert;

			if (!privateKey || !certificate) {
				throw new Error('No se pudo extraer la clave privada o el certificado del archivo P12. Verifique la contraseña.');
			}

			const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
			const publicKeyPem = forge.pki.certificateToPem(certificate);
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

	/**
	 * Método de conveniencia para cargar desde una ruta de archivo.
	 * Internamente, lee el archivo y llama a `loadFromBuffer`.
	 * @param p12Path La ruta al archivo .p12.
	 * @param password La contraseña.
	 */
	public async loadFromFile(p12Path: string, password: string): Promise<ICertificateData> {
		const p12Buffer = await fs.readFile(p12Path);
		return this.loadFromBuffer(p12Buffer, password);
	}

}