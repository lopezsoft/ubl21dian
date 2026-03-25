import { ICommand, ICommandServices, ISendBillAttachmentAsyncParams } from '../common/interfaces';
import { SendBillAttachmentAsyncTemplate } from '../soap/templates/SendBillAttachmentAsyncTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { SEND_BILL_ATTACHMENT_ASYNC_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación SendBillAttachmentAsync de la DIAN.
 * Envía un documento adjunto (AttachedDocument) de forma asíncrona.
 */
export class SendBillAttachmentAsyncCommand implements ICommand<ISendBillAttachmentAsyncParams, any> {
  public async execute(services: ICommandServices, params: ISendBillAttachmentAsyncParams): Promise<any> {
    const action = SEND_BILL_ATTACHMENT_ASYNC_ACTION;
    const url = DianEndpoints[services.environment];
    const signedXml = services.xmlSigner.sign(params.unsignedAttachedDocumentXml, services.certificateData, action, url);
    const contentFileBase64 = Buffer.from(signedXml).toString('base64');

    const template = new SendBillAttachmentAsyncTemplate();
    const unsignedSoap = template.getXml({
      fileName: params.fileName,
      contentFile: contentFileBase64,
    });

    const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

    const responseXml = await services.soapClient.post(signedSoap, { action });

    const parsedResponse = fastXmlParser.parse(responseXml);
    return parsedResponse?.['Envelope']?.['Body']?.['SendBillAttachmentAsyncResponse']?.['SendBillAttachmentAsyncResult'];
  }
}
