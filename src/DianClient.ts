import { Certificate, ICertificateData } from './security/Certificate';
import { SoapClient } from './http/SoapClient';
import { GetStatusTemplate } from './soap/templates/GetStatusTemplate';
import { SoapSigner } from './security/SoapSigner'; // Importamos el nuevo signer
import { fastXmlParser } from './common/utils';
import {IDianClientOptions} from "./common/interfaces";

/**
 * Cliente principal para interactuar con los servicios de la DIAN.
 */
export class DianClient {
	private readonly options: IDianClientOptions;
	private certificateData?: ICertificateData;
	private soapClient: SoapClient;
	private soapSigner: SoapSigner; // Propiedad para el SoapSigner

	constructor(options: IDianClientOptions) {
		this.options = options;
		this.soapClient = new SoapClient(options.environment);
		this.soapSigner = new SoapSigner(); // Instanciamos el SoapSigner
	}

	public async initialize(): Promise<void> {
		const certificate = new Certificate(this.options.certificatePath, this.options.passwordPsswrd);
		this.certificateData = await certificate.load();
		console.log('Certificado cargado exitosamente.');
	}

	public async getStatus(trackId: string): Promise<any> {
		if (!this.certificateData) {
			throw new Error('El cliente no ha sido inicializado. Llama a initialize() primero.');
		}

		const template = new GetStatusTemplate();
		const unsignedSoap = template.getXml({ trackId });

		// CORRECCIÓN: Ahora firmamos el sobre SOAP antes de enviarlo.
		const signedSoap = this.soapSigner.sign(unsignedSoap, this.certificateData);

		const responseXml = await this.soapClient.post(
			signedSoap, {
				SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatus',
			}
		);

		const parsedResponse = fastXmlParser.parse(responseXml);
		// La estructura de la respuesta puede variar, navegamos de forma segura.
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetStatusResponse']?.['GetStatusResult'];
	}
}