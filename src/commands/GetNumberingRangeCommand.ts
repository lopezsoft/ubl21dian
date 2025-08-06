import {ICommand, ICommandServices, IGetNumberingRangeParams} from '../common/interfaces';
import { GetNumberingRangeTemplate } from '../soap/templates/GetNumberingRangeTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";
import {GET_NUMBERING_RANGE_ACTION} from "../common/constants";

/**
 * Comando para ejecutar la operación GetNumberingRange de la DIAN.
 */
export class GetNumberingRangeCommand implements ICommand<IGetNumberingRangeParams, any> {
	public async execute(services: ICommandServices, params: IGetNumberingRangeParams): Promise<any> {
		const template = new GetNumberingRangeTemplate();
		const unsignedSoap = template.getXml(params);
		const action  = GET_NUMBERING_RANGE_ACTION;
		const url     = DianEndpoints[services.environment];
		const signedSoap = (services.soapSigner).sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetNumberingRangeResponse']?.['GetNumberingRangeResult'];
	}
}