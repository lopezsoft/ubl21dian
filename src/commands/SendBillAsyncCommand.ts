import {ICommand, ICommandServices, ISendBillAsyncParams} from '../common/interfaces';
import { SendBillAsyncTemplate } from '../soap/templates/SendBillAsyncTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";


/**
 * Comando para ejecutar la operación SendBillAsync de la DIAN.
 */
export class SendBillAsyncCommand implements ICommand<ISendBillAsyncParams, any> {
	public async execute(services: ICommandServices, params: ISendBillAsyncParams): Promise<any> {
		const action  = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillAsync';
		const url     = DianEndpoints[services.environment];
		const signedUblXml = services.xmlSigner.sign(params.unsignedUblXml, services.certificateData, url, action);
		const contentFileBase64 = Buffer.from(signedUblXml).toString('base64');

		const template = new SendBillAsyncTemplate();
		const unsignedSoap = template.getXml({
			fileName: params.fileName,
			contentFile: contentFileBase64,
		});

		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['SendBillAsyncResponse']?.['SendBillAsyncResult'];
	}
}