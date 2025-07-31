import {ICommand, ICommandServices, IGetStatusZipParams} from '../common/interfaces';
import { GetStatusZipTemplate } from '../soap/templates/GetStatusZipTemplate';
import { fastXmlParser } from '../common/utils';
/**
 * Comando para ejecutar la operación GetStatusZip de la DIAN.
 */
export class GetStatusZipCommand implements ICommand<IGetStatusZipParams, any> {
	public async execute(services: ICommandServices, params: IGetStatusZipParams): Promise<any> {
		const template = new GetStatusZipTemplate();
		const unsignedSoap = template.getXml({ trackId: params.trackId });
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusZip',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetStatusZipResponse']?.['GetStatusZipResult'];
	}
}