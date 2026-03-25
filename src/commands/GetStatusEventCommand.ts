import { ICommand, ICommandServices, IGetStatusEventParams } from '../common/interfaces';
import { GetStatusEventTemplate } from '../soap/templates/GetStatusEventTemplate';
import { fastXmlParser } from '../common/utils';
import { DianEndpoints } from '../config/dianEndpoints';
import { GET_STATUS_EVENT_ACTION } from '../common/constants';

/**
 * Comando para ejecutar la operación GetStatusEvent de la DIAN.
 * Consulta el estado de un evento enviado.
 */
export class GetStatusEventCommand implements ICommand<IGetStatusEventParams, any> {
  public async execute(services: ICommandServices, params: IGetStatusEventParams): Promise<any> {
    const template = new GetStatusEventTemplate();
    const unsignedSoap = template.getXml({ trackId: params.trackId });
    const action = GET_STATUS_EVENT_ACTION;
    const url = DianEndpoints[services.environment];
    const signedSoap = services.soapSigner.sign(unsignedSoap, services.certificateData, action, url);

    const responseXml = await services.soapClient.post(signedSoap, { action });

    const parsedResponse = fastXmlParser.parse(responseXml);
    return parsedResponse?.['Envelope']?.['Body']?.['GetStatusEventResponse']?.['GetStatusEventResult'];
  }
}
