import { ICommand, ICommandServices, ISendBillSyncParams } from '../common/interfaces';
import { SendBillSyncTemplate } from '../soap/templates/SendBillSyncTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { SEND_BILL_SYNC_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación SendBillSync de la DIAN.
 */
export class SendBillSyncCommand implements ICommand<ISendBillSyncParams, any> {
	public async execute(services: ICommandServices, params: ISendBillSyncParams): Promise<any> {
		const action = SEND_BILL_SYNC_ACTION;
		const url = DianEndpoints[services.environment];
		const signedUblXml = services.xmlSigner.sign(params.unsignedUblXml, services.certificateData, action, url);
		const contentFileBase64 = Buffer.from(signedUblXml).toString('base64');

		const template = new SendBillSyncTemplate();
		const unsignedSoap = template.getXml({
			fileName: params.fileName,
			contentFile: contentFileBase64,
		});

		const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, { action });

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['SendBillSyncResponse']?.['SendBillSyncResult'];
	}
}