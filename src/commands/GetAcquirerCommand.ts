import {ICommand, ICommandServices, IGetAcquirerParams} from '../common/interfaces';
import { GetAcquirerTemplate } from '../soap/templates/GetAcquirerTemplate';
import { fastXmlParser } from '../common/utils';

/**
 * Comando para ejecutar la operación GetAcquirer de la DIAN.
 */
export class GetAcquirerCommand implements ICommand<IGetAcquirerParams, any> {
	public async execute(services: ICommandServices, params: IGetAcquirerParams): Promise<any> {
		const template = new GetAcquirerTemplate();
		const unsignedSoap = template.getXml(params);
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetAcquirer',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetAcquirerResponse']?.['GetAcquirerResult'];
	}
}