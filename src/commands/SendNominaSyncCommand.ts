import { ICommand, ICommandServices, ISendNominaSyncParams } from '../common/interfaces';
import { SendNominaSyncTemplate } from '../soap/templates/SendNominaSyncTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { SEND_NOMINA_SYNC_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación SendNominaSync de la DIAN.
 */
export class SendNominaSyncCommand implements ICommand<ISendNominaSyncParams, any> {
	public async execute(services: ICommandServices, params: ISendNominaSyncParams): Promise<any> {
		const action = SEND_NOMINA_SYNC_ACTION;
		const url = DianEndpoints[services.environment];
		const signedPayrollXml = services.payrollSigner.sign(params.unsignedPayrollXml, services.certificateData, action, url);
		const contentFileBase64 = Buffer.from(signedPayrollXml).toString('base64');

		const template = new SendNominaSyncTemplate();
		const unsignedSoap = template.getXml({ contentFile: contentFileBase64 });
		const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, { action });

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['SendNominaSyncResponse']?.['SendNominaSyncResult'];
	}
}