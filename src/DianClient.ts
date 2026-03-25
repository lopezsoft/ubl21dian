import { Certificate } from './security/Certificate';
import { SoapClient } from './http/SoapClient';
import { SoapSigner } from './security/SoapSigner';
import { XmlSigner } from './security/XmlSigner';
import { PayrollSigner } from './security/PayrollSigner';
import {
	ICertificateData,
	ICommand,
	ICommandServices,
	IDianClientInitializeOptions,
	IDianClientOptions,
	ISigner
} from './common/interfaces';

/**
 * FACADE: Punto de entrada principal a la librería.
 * Proporciona una interfaz simple para un subsistema complejo (firma, SOAP, etc.).
 */
export class DianClient {
	private readonly services: ICommandServices;
	private isInitialized = false;

	constructor(public options: IDianClientOptions) {
		this.services = {
			soapClient: new SoapClient(options.environment),
			soapSigner: new SoapSigner() as ISigner,
			xmlSigner: new XmlSigner() as ISigner,
			payrollSigner: new PayrollSigner() as ISigner,
			certificateData: {} as ICertificateData,
			environment: options.environment
		};
	}

	/**
	 * Carga el certificado digital y prepara el cliente para su uso.
	 */
	public async initialize(options: IDianClientInitializeOptions): Promise<void> {
		const certificateHandler = new Certificate();
		this.services.certificateData = await certificateHandler.loadFromBuffer(
			options.certificate,
			options.passwordPsswrd
		);
		this.isInitialized = true;
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