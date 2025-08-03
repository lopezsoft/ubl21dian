import { Certificate } from '../../src/security/Certificate';
import * as fs from 'fs';
import * as path from 'path';

// NOTA: Para que esta prueba funcione, necesitas un certificado de prueba.
// Crea una carpeta 'tests/certs' y coloca un archivo .p12 de prueba.
const TEST_CERT_PATH = path.join(__dirname, '../certs/certificado_prueba.p12');
const TEST_CERT_PASSWORD = 'tu_password_de_prueba';

describe('Certificate', () => {
	// Verificar que el certificado de prueba exista antes de correr las pruebas
	beforeAll(() => {
		if (!fs.existsSync(TEST_CERT_PATH)) {
			throw new Error(`El certificado de prueba no se encontró en: ${TEST_CERT_PATH}`);
		}
	});

	it('debería cargar y parsear un certificado .p12 correctamente', async () => {
		const certificate = new Certificate(TEST_CERT_PATH, TEST_CERT_PASSWORD);
		const certData = await certificate.load();

		// Verificamos que los datos extraídos no estén vacíos
		expect(certData).toBeDefined();
		expect(certData.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
		expect(certData.publicKeyPem).toContain('-----BEGIN CERTIFICATE-----');
		expect(certData.x509CertificateBase64).not.toContain('-----');
	});

	it('debería lanzar un error si la contraseña es incorrecta', async () => {
		const certificate = new Certificate(TEST_CERT_PATH, 'password_incorrecto');

		// Esperamos que la promesa sea rechazada con un error específico
		await expect(certificate.load()).rejects.toThrow('La contraseña del certificado es incorrecta.');
	});
});