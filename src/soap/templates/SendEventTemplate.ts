import { BaseTemplate } from './BaseTemplate';
import {ISendEventTemplateParams} from "../../common/interfaces";



export class SendEventTemplate extends BaseTemplate {
	getXml(params: ISendEventTemplateParams): string {
		if (!params.contentFile) {
			throw new Error('El parámetro contentFile es requerido.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
         <soap:Header/>
         <soap:Body>
            <wcf:SendEventUpdateStatus>
               <wcf:contentFile>${params.contentFile}</wcf:contentFile>
            </wcf:SendEventUpdateStatus>
         </soap:Body>
      </soap:Envelope>
    `;
	}
}