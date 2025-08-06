import {ICommand, ICommandServices, IGetReferenceNotesParams} from '../common/interfaces';
import { GetReferenceNotesTemplate } from '../soap/templates/GetReferenceNotesTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";
import {GET_REFERENCE_NOTES_ACTION} from "../common/constants";

/**
 * Comando para ejecutar la operación GetReferenceNotes de la DIAN.
 */
export class GetReferenceNotesCommand implements ICommand<IGetReferenceNotesParams, any> {
	public async execute(services: ICommandServices, params: IGetReferenceNotesParams): Promise<any> {
		const template = new GetReferenceNotesTemplate();
		const unsignedSoap = template.getXml(params);
		const action  = GET_REFERENCE_NOTES_ACTION;
		const url     = DianEndpoints[services.environment];
		const signedSoap = (services.soapSigner).sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetReferenceNotesResponse']?.['GetReferenceNotesResult'];
	}
}