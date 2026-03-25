import { ICommand, ICommandServices, ISendTestSetAsyncParams } from '../common/interfaces';
import { SendTestSetAsyncTemplate } from '../soap/templates/SendTestSetAsyncTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { SEND_TEST_SET_ASYNC_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación SendTestSetAsync de la DIAN.
 * Envía un conjunto de pruebas (TestSet) al ambiente de habilitación.
 */
export class SendTestSetAsyncCommand implements ICommand<ISendTestSetAsyncParams, any> {
	public async execute(services: ICommandServices, params: ISendTestSetAsyncParams): Promise<any> {
		const action = SEND_TEST_SET_ASYNC_ACTION;
		const url = DianEndpoints[services.environment];

		const template = new SendTestSetAsyncTemplate();
		const unsignedSoap = template.getXml({
			fileName: params.fileName,
			contentFile: params.contentFile,
			testSetId: params.testSetId,
		});

		const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

		const responseXml = await services.soapClient.post(signedSoap, { action });

		const parsedResponse = fastXmlParser.parse(responseXml);
		return parsedResponse?.['Envelope']?.['Body']?.['SendTestSetAsyncResponse']?.['SendTestSetAsyncResult'];
	}
}