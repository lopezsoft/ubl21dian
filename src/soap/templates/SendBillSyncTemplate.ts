import { BaseTemplate } from './BaseTemplate';
import {ISendBillSyncTemplateParams} from "../../common/interfaces";

/**
 * Plantilla para la acción SendBillSync del web service de la DIAN.
 */
export class SendBillSyncTemplate extends BaseTemplate {
	public getXml(params: ISendBillSyncTemplateParams): string {
		if (!params.fileName || !params.contentFile) {
			throw new Error('Los parámetros fileName y contentFile son requeridos.');
		}

		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:SendBillSync>
            <wcf:fileName>${params.fileName}</wcf:fileName>
            <wcf:contentFile>${params.contentFile}</wcf:contentFile>
          </wcf:SendBillSync>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}