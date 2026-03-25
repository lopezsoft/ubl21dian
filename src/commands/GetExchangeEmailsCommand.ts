import { ICommand, ICommandServices, IGetExchangeEmailsParams } from '../common/interfaces';
import { GetExchangeEmailsTemplate } from '../soap/templates/GetExchangeEmailsTemplate';
import { fastXmlParser } from '../common/utils';
import { GET_EXCHANGE_EMAILS_ACTION } from '../common/constants';
import { DianEndpoints } from '../config/dianEndpoints';

/**
 * Comando para ejecutar la operación GetExchangeEmails de la DIAN.
 */
export class GetExchangeEmailsCommand implements ICommand<IGetExchangeEmailsParams, any> {
	public async execute(services: ICommandServices, _params: IGetExchangeEmailsParams): Promise<any> {
		const template = new GetExchangeEmailsTemplate();
		const unsignedSoap = template.getXml();
		const action = GET_EXCHANGE_EMAILS_ACTION;
		const url = DianEndpoints[services.environment];
		const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action: action
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetExchangeEmailsResponse']?.['GetExchangeEmailsResult'];
	}
}