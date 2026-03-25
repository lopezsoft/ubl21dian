import { BaseTemplate } from './BaseTemplate';
import { IGetStatusEventParams } from '../../common/interfaces';

/**
 * Plantilla para la acción GetStatusEvent del web service de la DIAN.
 */
export class GetStatusEventTemplate extends BaseTemplate {
  getXml(params: IGetStatusEventParams): string {
    if (!params.trackId) {
      throw new Error('El parámetro trackId es requerido.');
    }
    return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:GetStatusEvent>
            <wcf:trackId>${params.trackId}</wcf:trackId>
          </wcf:GetStatusEvent>
        </soap:Body>
      </soap:Envelope>
    `;
  }
}
