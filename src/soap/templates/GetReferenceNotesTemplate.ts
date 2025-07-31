import { BaseTemplate } from './BaseTemplate';
import {IGetReferenceNotesParams} from "../../common/interfaces";



/**
 * Plantilla para la acción GetReferenceNotes de la DIAN.
 */
export class GetReferenceNotesTemplate extends BaseTemplate {
	getXml(params: IGetReferenceNotesParams): string {
		if (!params.trackId) {
			throw new Error('El parámetro trackId es requerido.');
		}
		return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Body>
          <wcf:GetReferenceNotes>
            <wcf:trackId>${params.trackId}</wcf:trackId>
          </wcf:GetReferenceNotes>
        </soap:Body>
      </soap:Envelope>
    `;
	}
}