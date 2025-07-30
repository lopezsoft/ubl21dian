import { BaseTemplate } from './BaseTemplate';
import {ITemplateParams} from "../../common/interfaces";

export interface IGetStatusParams extends ITemplateParams {
	trackId: string;
}

/**
 * Plantilla para la acción GetStatus del web service de la DIAN.
 */
export class GetStatusTemplate extends BaseTemplate {
	/**
	 * Genera el XML para la petición GetStatus.
	 * @param params Objeto que debe contener la propiedad `trackId`.
	 * @returns El sobre SOAP para la petición.
	 */
	getXml(params: IGetStatusParams): string {
		if (!params.trackId) {
			throw new Error('El parámetro trackId es requerido para GetStatus.');
		}

		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:GetStatus>
            <wcf:trackId>${params.trackId}</wcf:trackId>
          </wcf:GetStatus>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}