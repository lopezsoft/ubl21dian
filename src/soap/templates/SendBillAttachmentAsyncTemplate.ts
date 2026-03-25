import { BaseTemplate } from './BaseTemplate';
import { ISendBillAttachmentAsyncTemplateParams } from '../../common/interfaces';

/**
 * Plantilla para la acción SendBillAttachmentAsync del web service de la DIAN.
 */
export class SendBillAttachmentAsyncTemplate extends BaseTemplate {
  getXml(params: ISendBillAttachmentAsyncTemplateParams): string {
    if (!params.fileName || !params.contentFile) {
      throw new Error('Los parámetros fileName y contentFile son requeridos.');
    }
    return `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
        <soap:Header/>
        <soap:Body>
          <wcf:SendBillAttachmentAsync>
            <wcf:fileName>${params.fileName}</wcf:fileName>
            <wcf:contentFile>${params.contentFile}</wcf:contentFile>
          </wcf:SendBillAttachmentAsync>
        </soap:Body>
      </soap:Envelope>
    `;
  }
}