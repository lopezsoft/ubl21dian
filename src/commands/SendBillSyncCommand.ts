import {ICommand, ICommandServices, ISendBillSyncParams} from '../common/interfaces';
import { SendBillSyncTemplate } from '../soap/templates/SendBillSyncTemplate';
import { fastXmlParser } from '../common/utils';
/**
 * Comando para ejecutar la operación SendBillSync de la DIAN.
 */
export class SendBillSyncCommand implements ICommand<ISendBillSyncParams, any> {
	public async execute(services: ICommandServices, params: ISendBillSyncParams): Promise<any> {
		const signedUblXml = await services.xmlSigner.sign(params.unsignedUblXml, services.certificateData);
		const contentFileBase64 = Buffer.from(signedUblXml).toString('base64');

		const template = new SendBillSyncTemplate();
		const unsignedSoap = template.getXml({
			fileName: params.fileName,
			contentFile: contentFileBase64,
		});

		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['SendBillSyncResponse']?.['SendBillSyncResult'];
	}
}