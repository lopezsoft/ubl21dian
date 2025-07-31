import { BaseTemplate } from './BaseTemplate';
import {IGetXmlByDocumentKeyParams} from "../../common/interfaces";

/**
 * Plantilla para la acción GetXmlByDocumentKey del web service de la DIAN.
 */
export class GetXmlByDocumentKeyTemplate extends BaseTemplate {
	getXml(params: IGetXmlByDocumentKeyParams): string {
		if (!params.trackId) {
			throw new Error('El parámetro trackId es requerido.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:GetXmlByDocumentKey>
            <wcf:trackId>${params.trackId}</wcf:trackId>
          </wcf:GetXmlByDocumentKey>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}