import { BaseTemplate } from './BaseTemplate';
import {IGetStatusZipParams} from "../../common/interfaces";


/**
 * Plantilla para la acción GetStatusZip del web service de la DIAN.
 */
export class GetStatusZipTemplate extends BaseTemplate {
	getXml(params: IGetStatusZipParams): string {
		if (!params.trackId) {
			throw new Error('El parámetro trackId es requerido para GetStatusZip.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:GetStatusZip>
            <wcf:trackId>${params.trackId}</wcf:trackId>
          </wcf:GetStatusZip>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}