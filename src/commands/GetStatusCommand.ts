import {ICommand, ICommandServices, IGetStatusCommandParams} from '../common/interfaces';
import { GetStatusTemplate } from '../soap/templates/GetStatusTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";
import {GET_STATUS_ACTION} from "../common/constants";
/**
 * Comando para ejecutar la operación GetStatus de la DIAN.
 */
export class GetStatusCommand implements ICommand<IGetStatusCommandParams, any> {
	public async execute(services: ICommandServices, params: IGetStatusCommandParams): Promise<any> {
		const template = new GetStatusTemplate();
		const unsignedSoap = template.getXml({ trackId: params.trackId });
		const action  = GET_STATUS_ACTION;
		const url     = DianEndpoints[services.environment];
		// La firma SOAP ahora es una responsabilidad del SoapSigner que pasamos en los servicios
		const signedSoap = (services.soapSigner).sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetStatusResponse']?.['GetStatusResult'];
	}
}