import {ICommand, ICommandServices, IGetXmlByDocumentKeyParams} from '../common/interfaces';
import { GetXmlByDocumentKeyTemplate } from '../soap/templates/GetXmlByDocumentKeyTemplate';
import { fastXmlParser } from '../common/utils';
/**
 * Comando para ejecutar la operación GetXmlByDocumentKey de la DIAN.
 */
export class GetXmlByDocumentKeyCommand implements ICommand<IGetXmlByDocumentKeyParams, any> {
	public async execute(services: ICommandServices, params: IGetXmlByDocumentKeyParams): Promise<any> {
		const template = new GetXmlByDocumentKeyTemplate();
		const unsignedSoap = template.getXml(params);
		const signedSoap = (services.soapSigner as any).sign(unsignedSoap, services.certificateData);

		const responseXml = await services.soapClient.post(signedSoap, {
			SOAPAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetXmlByDocumentKey',
		});

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['s:Envelope']?.['s:Body']?.['GetXmlByDocumentKeyResponse']?.['GetXmlByDocumentKeyResult'];
	}
}