import { BaseTemplate } from './BaseTemplate';
import {ISendTestSetAsyncParams} from "../../common/interfaces";
/**
 * Plantilla para la acción SendTestSetAsync del web service de la DIAN.
 */
export class SendTestSetAsyncTemplate extends BaseTemplate {
	getXml(params: ISendTestSetAsyncParams): string {
		if (!params.fileName || !params.contentFile || !params.testSetId) {
			throw new Error('Los parámetros fileName, contentFile y testSetId son requeridos.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:SendTestSetAsync>
            <wcf:fileName>${params.fileName}</wcf:fileName>
            <wcf:contentFile>${params.contentFile}</wcf:contentFile>
            <wcf:testSetId>${params.testSetId}</wcf:testSetId>
          </wcf:SendTestSetAsync>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}