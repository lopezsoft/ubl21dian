import { Certificate, ICertificateData } from './security/Certificate';
import { SoapClient } from './http/SoapClient';
import { SoapSigner } from './security/SoapSigner';
import { XmlSigner } from './security/XmlSigner';
import { PayrollSigner } from './security/PayrollSigner';
import {ICommand, ICommandServices, IDianClientOptions} from './common/interfaces';

/**
 * FACADE: Punto de entrada principal a la librería.
 * Proporciona una interfaz simple para un subsistema complejo (firma, SOAP, etc.).
 * Su responsabilidad es gestionar los servicios y ejecutar los comandos.
 */
export class DianClient {
	private readonly services: ICommandServices;
	private isInitialized = false;

	constructor(public options: IDianClientOptions) {
		this.services = {
			soapClient: new SoapClient(options.environment),
			soapSigner: new SoapSigner() as any, // Cast a ISigner si es necesario
			xmlSigner: new XmlSigner(),
			payrollSigner: new PayrollSigner(),
			certificateData: {} as ICertificateData,
		};
	}

	/**
	 * Carga el certificado digital y prepara el cliente para su uso.
	 */
	public async initialize(): Promise<void> {
		const certificate = new Certificate(this.options.certificatePath, this.options.passwordPsswrd);
		this.services.certificateData = await certificate.load();
		this.isInitialized = true;
		console.log('Certificado cargado y cliente inicializado.');
	}

	/**
	 * Ejecuta un comando para interactuar con la DIAN.
	 * @param command La instancia del comando a ejecutar (p. ej. new GetStatusCommand()).
	 * @param params Los parámetros para ese comando.
	 * @returns El resultado de la ejecución del comando.
	 */
	public async execute<TParams, TResult>(
		command: ICommand<TParams, TResult>,
		params: TParams
	): Promise<TResult> {
		if (!this.isInitialized) {
			throw new Error('El cliente no ha sido inicializado. Llama a initialize() primero.');
		}
		return command.execute(this.services, params);
	}
}