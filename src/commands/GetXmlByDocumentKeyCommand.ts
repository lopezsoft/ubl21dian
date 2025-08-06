import {ICommand, ICommandServices, IGetXmlByDocumentKeyParams} from '../common/interfaces';
import { GetXmlByDocumentKeyTemplate } from '../soap/templates/GetXmlByDocumentKeyTemplate';
import { fastXmlParser } from '../common/utils';
import {DianEndpoints} from "../config/dianEndpoints";
import {GET_XML_BY_DOCUMENT_KEY_ACTION} from "../common/constants";
/**
 * Comando para ejecutar la operación GetXmlByDocumentKey de la DIAN.
 */
export class GetXmlByDocumentKeyCommand implements ICommand<IGetXmlByDocumentKeyParams, any> {
	public async execute(services: ICommandServices, params: IGetXmlByDocumentKeyParams): Promise<any> {
		const template = new GetXmlByDocumentKeyTemplate();
		const unsignedSoap = template.getXml(params);
		const action  = GET_XML_BY_DOCUMENT_KEY_ACTION;
		const url     = DianEndpoints[services.environment];
		const signedSoap = (services.soapSigner).sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, {
			action,
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['GetXmlByDocumentKeyResponse']?.['GetXmlByDocumentKeyResult'];
	}
}