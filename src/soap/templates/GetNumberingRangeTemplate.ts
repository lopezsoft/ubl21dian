import { BaseTemplate } from './BaseTemplate';
import {IGetNumberingRangeParams} from "../../common/interfaces";

/**
 * Plantilla para la acción GetNumberingRange del web service de la DIAN.
 */
export class GetNumberingRangeTemplate extends BaseTemplate {
	getXml(params: IGetNumberingRangeParams): string {
		if (!params.accountCode || !params.accountCodeT || !params.softwareCode) {
			throw new Error('Los parámetros accountCode, accountCodeT y softwareCode son requeridos.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
         <soap:Header/>
         <soap:Body>
            <wcf:GetNumberingRange>
               <wcf:accountCode>${params.accountCode}</wcf:accountCode>
               <wcf:accountCodeT>${params.accountCodeT}</wcf:accountCodeT>
               <wcf:softwareCode>${params.softwareCode}</wcf:softwareCode>
            </wcf:GetNumberingRange>
         </soap:Body>
      </soap:Envelope>
    `;
	}
}