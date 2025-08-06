import { BaseTemplate } from './BaseTemplate';

/**
 * Plantilla para la acción GetExchangeEmails del web service de la DIAN.
 * Esta acción no requiere parámetros en el cuerpo del SOAP.
 */
export class GetExchangeEmailsTemplate extends BaseTemplate {
	getXml(): string {
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
			   <soap:Body>
			      <wcf:GetExchangeEmails/>
			   </soap:Body>
			</soap:Envelope>
    `;
	}
}