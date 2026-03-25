import { Certificate } from '../../src/security/Certificate';
import * as fs from 'fs';
import * as path from 'path';

const TEST_CERT_PATH = path.join(__dirname, '../certs/certificado_prueba.p12');
const TEST_CERT_PASSWORD = 'tu_password_de_prueba';

describe('Certificate', () => {
	const certFileExists = fs.existsSync(TEST_CERT_PATH);

	it('debería cargar y parsear un certificado .p12 correctamente', async () => {
		if (!certFileExists) {
			console.warn(`Certificado de prueba no encontrado en: ${TEST_CERT_PATH}. Test omitido.`);
			return;
		}

		const certificate = new Certificate();
		const certData = await certificate.loadFromFile(TEST_CERT_PATH, TEST_CERT_PASSWORD);

		expect(certData).toBeDefined();
		expect(certData.privateKeyPem).toContain('-----BEGIN');
		expect(certData.publicKeyPem).toContain('-----BEGIN CERTIFICATE-----');
		expect(certData.x509CertificateBase64).not.toContain('-----');
	});

	it('debería lanzar un error si la contraseña es incorrecta', async () => {
		if (!certFileExists) {
			console.warn(`Certificado de prueba no encontrado en: ${TEST_CERT_PATH}. Test omitido.`);
			return;
		}

		const certificate = new Certificate();
		await expect(certificate.loadFromFile(TEST_CERT_PATH, 'password_incorrecto'))
			.rejects.toThrow('La contraseña del certificado es incorrecta');
	});

	it('debería lanzar un error si el buffer es inválido', async () => {
		const certificate = new Certificate();
		const invalidBuffer = Buffer.from('contenido-invalido');

		await expect(certificate.loadFromBuffer(invalidBuffer, 'test'))
			.rejects.toThrow('Error crítico al procesar el certificado');
	});
});