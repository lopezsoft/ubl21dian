import {ICommand, ICommandServices, IGetAcquirerParams} from '../common/interfaces';
import { GetAcquirerTemplate } from '../soap/templates/GetAcquirerTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";
import {GET_ACQUIRER_ACTION} from "../common/constants";

/**
 * Comando para ejecutar la operación GetAcquirer de la DIAN.
 */
export class GetAcquirerCommand implements ICommand<IGetAcquirerParams, any> {
	public async execute(services: ICommandServices, params: IGetAcquirerParams): Promise<any> {
		const template = new GetAcquirerTemplate();
		const unsignedSoap = template.getXml(params);
		const action = GET_ACQUIRER_ACTION;
		const url = DianEndpoints[services.environment];
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action: action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetAcquirerResponse']?.['GetAcquirerResult'];
	}
}