import {ICommand, ICommandServices, IGetNumberingRangeParams} from '../common/interfaces';
import { GetNumberingRangeTemplate } from '../soap/templates/GetNumberingRangeTemplate';
import { fastXmlParser } from '../common/utils';

/**
 * Comando para ejecutar la operación GetNumberingRange de la DIAN.
 */
export class GetNumberingRangeCommand implements ICommand<IGetNumberingRangeParams, any> {
	public async execute(services: ICommandServices, params: IGetNumberingRangeParams): Promise<any> {
		const template = new GetNumberingRangeTemplate();
		const unsignedSoap = template.getXml(params);
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetNumberingRange',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetNumberingRangeResponse']?.['GetNumberingRangeResult'];
	}
}