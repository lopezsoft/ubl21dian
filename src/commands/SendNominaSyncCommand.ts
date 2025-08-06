import {ICommand, ICommandServices, ISendNominaSyncParams} from '../common/interfaces';
import { SendNominaSyncTemplate } from '../soap/templates/SendNominaSyncTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";

/**
 * Comando para ejecutar la operación SendNominaSync de la DIAN.
 */
export class SendNominaSyncCommand implements ICommand<ISendNominaSyncParams, any> {
	public async execute(services: ICommandServices, params: ISendNominaSyncParams): Promise<any> {
		const action  = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync';
		const url     = DianEndpoints[services.environment];
		const signedPayrollXml = services.payrollSigner.sign(params.unsignedPayrollXml, services.certificateData, action, url);
		const contentFileBase64 = Buffer.from(signedPayrollXml).toString('base64');

		const template = new SendNominaSyncTemplate();
		const unsignedSoap = template.getXml({ contentFile: contentFileBase64 });
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendNominaSync',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['SendNominaSyncResponse']?.['SendNominaSyncResult'];
	}
}