import { BaseTemplate } from './BaseTemplate';
import {IGetAcquirerParams} from "../../common/interfaces";


/**
 * Plantilla para la acción GetAcquirer de la DIAN.
 */
export class GetAcquirerTemplate extends BaseTemplate {
	getXml(params: IGetAcquirerParams): string {
		if (!params.identificationType || !params.identificationNumber) {
			throw new Error('Los parámetros identificationType y identificationNumber son requeridos.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Body>
          <wcf:GetAcquirer>
             <wcf:identificationType>${params.identificationType}</wcf:identificationType>
             <wcf:identificationNumber>${params.identificationNumber}</wcf:identificationNumber>
          </wcf:GetAcquirer>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}