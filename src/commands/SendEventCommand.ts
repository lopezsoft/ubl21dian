import { ICommand, ICommandServices, ISendEventParams } from '../common/interfaces';
import { SendEventTemplate } from '../soap/templates/SendEventTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { SEND_EVENT_UPDATE_STATUS_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación SendEventUpdateStatus de la DIAN.
 */
export class SendEventCommand implements ICommand<ISendEventParams, any> {
	public async execute(services: ICommandServices, params: ISendEventParams): Promise<any> {
		const action = SEND_EVENT_UPDATE_STATUS_ACTION;
		const url = DianEndpoints[services.environment];
		const signedEventXml = services.xmlSigner.sign(params.unsignedEventXml, services.certificateData, action, url);
		const contentFileBase64 = Buffer.from(signedEventXml).toString('base64');

		const template = new SendEventTemplate();
		const unsignedSoap = template.getXml({ contentFile: contentFileBase64 });
		const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, { action });

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['SendEventUpdateStatusResponse']?.['SendEventUpdateStatusResult'];
	}
}