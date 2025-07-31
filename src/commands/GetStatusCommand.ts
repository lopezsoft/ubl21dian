import {ICommand, ICommandServices, IGetStatusCommandParams} from '../common/interfaces';
import { GetStatusTemplate } from '../soap/templates/GetStatusTemplate';
import { fastXmlParser } from '../common/utils';
/**
 * Comando para ejecutar la operación GetStatus de la DIAN.
 */
export class GetStatusCommand implements ICommand<IGetStatusCommandParams, any> {
	public async execute(services: ICommandServices, params: IGetStatusCommandParams): Promise<any> {
		const template = new GetStatusTemplate();
		const unsignedSoap = template.getXml({ trackId: params.trackId });

		// La firma SOAP ahora es una responsabilidad del SoapSigner que pasamos en los servicios
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatus',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetStatusResponse']?.['GetStatusResult'];
	}
}