import {ICommand, ICommandServices, IGetReferenceNotesParams} from '../common/interfaces';
import { GetReferenceNotesTemplate } from '../soap/templates/GetReferenceNotesTemplate';
import { fastXmlParser } from '../common/utils';

/**
 * Comando para ejecutar la operación GetReferenceNotes de la DIAN.
 */
export class GetReferenceNotesCommand implements ICommand<IGetReferenceNotesParams, any> {
	public async execute(services: ICommandServices, params: IGetReferenceNotesParams): Promise<any> {
		const template = new GetReferenceNotesTemplate();
		const unsignedSoap = template.getXml(params);
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetReferenceNotes',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetReferenceNotesResponse']?.['GetReferenceNotesResult'];
	}
}