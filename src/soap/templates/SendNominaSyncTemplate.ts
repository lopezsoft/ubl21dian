import { BaseTemplate } from './BaseTemplate';
import {ISendNominaSyncTemplateParams} from "../../common/interfaces";

export class SendNominaSyncTemplate extends BaseTemplate {
	getXml(params: ISendNominaSyncTemplateParams): string {
		if (!params.contentFile) {
			throw new Error('El parámetro contentFile es requerido.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:SendNominaSync>
            <wcf:contentFile>${params.contentFile}</wcf:contentFile>
          </wcf:SendNominaSync>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}