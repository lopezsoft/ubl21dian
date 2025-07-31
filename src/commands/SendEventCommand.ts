import {ICommand, ICommandServices, ISendEventParams} from '../common/interfaces';
import { SendEventTemplate } from '../soap/templates/SendEventTemplate';
import { fastXmlParser } from '../common/utils';

/**
 * Comando para ejecutar la operación SendEventUpdateStatus de la DIAN.
 */
export class SendEventCommand implements ICommand<ISendEventParams, any> {
	public async execute(services: ICommandServices, params: ISendEventParams): Promise<any> {
		const signedEventXml = await services.xmlSigner.sign(params.unsignedEventXml, services.certificateData);
		const contentFileBase64 = Buffer.from(signedEventXml).toString('base64');

		const template = new SendEventTemplate();
		const unsignedSoap = template.getXml({ contentFile: contentFileBase64 });
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendEventUpdateStatus',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['SendEventUpdateStatusResponse']?.['SendEventUpdateStatusResult'];
	}
}