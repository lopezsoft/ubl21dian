import { BaseTemplate } from './BaseTemplate';
import {ISendBillAsyncTemplateParams} from "../../common/interfaces";

/**
 * Plantilla para la acción SendBillAsync del web service de la DIAN.
 */
export class SendBillAsyncTemplate extends BaseTemplate {
	public getXml(params: ISendBillAsyncTemplateParams): string {
		if (!params.fileName || !params.contentFile) {
			throw new Error('Los parámetros fileName y contentFile son requeridos.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:SendBillAsync>
            <wcf:fileName>${params.fileName}</wcf:fileName>
            <wcf:contentFile>${params.contentFile}</wcf:contentFile>
          </wcf:SendBillAsync>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}