import {ICommand, ICommandServices, IGetStatusZipParams} from '../common/interfaces';
import { GetStatusZipTemplate } from '../soap/templates/GetStatusZipTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";
import {GET_STATUS_ZIP_ACTION} from "../common/constants";
/**
 * Comando para ejecutar la operación GetStatusZip de la DIAN.
 */
export class GetStatusZipCommand implements ICommand<IGetStatusZipParams, any> {
	public async execute(services: ICommandServices, params: IGetStatusZipParams): Promise<any> {
		const template = new GetStatusZipTemplate();
		const unsignedSoap = template.getXml({ trackId: params.trackId });
		const action  = GET_STATUS_ZIP_ACTION;
		const url     = DianEndpoints[services.environment];
		const signedSoap = (services.soapSigner).sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetStatusZipResponse']?.['GetStatusZipResult'];
	}
}