import { ICommand, ICommandServices, ISendBillAsyncParams } from '../common/interfaces';
import { SendBillAsyncTemplate } from '../soap/templates/SendBillAsyncTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { SEND_BILL_ASYNC_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación SendBillAsync de la DIAN.
 */
export class SendBillAsyncCommand implements ICommand<ISendBillAsyncParams, any> {
	public async execute(services: ICommandServices, params: ISendBillAsyncParams): Promise<any> {
		const action = SEND_BILL_ASYNC_ACTION;
		const url = DianEndpoints[services.environment];
		const signedUblXml = services.xmlSigner.sign(params.unsignedUblXml, services.certificateData, action, url);
		const contentFileBase64 = Buffer.from(signedUblXml).toString('base64');

		const template = new SendBillAsyncTemplate();
		const unsignedSoap = template.getXml({
			fileName: params.fileName,
			contentFile: contentFileBase64,
		});

		const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, { action });

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['SendBillAsyncResponse']?.['SendBillAsyncResult'];
	}
}