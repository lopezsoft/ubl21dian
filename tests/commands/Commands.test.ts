import { ICommandServices, ICertificateData } from '../../src/common/interfaces';

// --- Commands ---
import { GetStatusCommand } from '../../src/commands/GetStatusCommand';
import { GetStatusZipCommand } from '../../src/commands/GetStatusZipCommand';
import { GetXmlByDocumentKeyCommand } from '../../src/commands/GetXmlByDocumentKeyCommand';
import { GetNumberingRangeCommand } from '../../src/commands/GetNumberingRangeCommand';
import { GetExchangeEmailsCommand } from '../../src/commands/GetExchangeEmailsCommand';
import { GetReferenceNotesCommand } from '../../src/commands/GetReferenceNotesCommand';
import { GetAcquirerCommand } from '../../src/commands/GetAcquirerCommand';
import { SendBillSyncCommand } from '../../src/commands/SendBillSyncCommand';
import { SendBillAsyncCommand } from '../../src/commands/SendBillAsyncCommand';
import { SendEventCommand } from '../../src/commands/SendEventCommand';
import { SendNominaSyncCommand } from '../../src/commands/SendNominaSyncCommand';
import { SendTestSetAsyncCommand } from '../../src/commands/SendTestSetAsyncCommand';
import { SendBillAttachmentAsyncCommand } from '../../src/commands/SendBillAttachmentAsyncCommand';

// ---------------------------------------------------------------------------
// Helpers — Mock services factory
// ---------------------------------------------------------------------------

function createMockServices(responseXml: string): {
  services: ICommandServices;
  mocks: {
    soapPost: jest.Mock;
    soapSign: jest.Mock;
    xmlSign: jest.Mock;
    payrollSign: jest.Mock;
  };
} {
  const soapPost = jest.fn().mockResolvedValue(responseXml);
  const soapSign = jest.fn().mockImplementation((xml: string) => `<SignedSOAP>${xml}</SignedSOAP>`);
  const xmlSign = jest.fn().mockImplementation((xml: string) => `<SignedXML>${xml}</SignedXML>`);
  const payrollSign = jest.fn().mockImplementation((xml: string) => `<SignedPayroll>${xml}</SignedPayroll>`);

  const certificateData: ICertificateData = {
    privateKeyPem: 'MOCK-PRIVATE-KEY',
    publicKeyPem: 'MOCK-PUBLIC-KEY',
    x509CertificateBase64: 'MOCK-CERT-BASE64',
  };

  const services: ICommandServices = {
    soapClient: { post: soapPost },
    soapSigner: { sign: soapSign },
    xmlSigner: { sign: xmlSign },
    payrollSigner: { sign: payrollSign },
    certificateData,
    environment: 2,
  };

  return { services, mocks: { soapPost, soapSign, xmlSign, payrollSign } };
}

/**
 * Construye un XML de respuesta SOAP con la estructura DIAN estándar.
 */
function buildSoapResponse(operation: string, resultContent: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Envelope>
  <Body>
    <${operation}Response>
      <${operation}Result>${resultContent}</${operation}Result>
    </${operation}Response>
  </Body>
</Envelope>`;
}

// ---------------------------------------------------------------------------
// Tests — Comandos de consulta (solo firman SOAP, no firman UBL)
// ---------------------------------------------------------------------------

describe('Comandos de consulta — solo SOAP signing', () => {

  describe('GetStatusCommand', () => {
    it('debería firmar SOAP, enviar y parsear respuesta', async () => {
      const responseXml = buildSoapResponse('GetStatus', '<StatusCode>00</StatusCode>');
      const { services, mocks } = createMockServices(responseXml);

      const cmd = new GetStatusCommand();
      const result = await cmd.execute(services, { trackId: 'TRACK-001' });

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(mocks.xmlSign).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debería pasar la action correcta al soapClient.post', async () => {
      const responseXml = buildSoapResponse('GetStatus', '<OK/>');
      const { services, mocks } = createMockServices(responseXml);

      await new GetStatusCommand().execute(services, { trackId: 'T1' });

      expect(mocks.soapPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ action: expect.stringContaining('GetStatus') }),
      );
    });
  });

  describe('GetStatusZipCommand', () => {
    it('debería firmar SOAP y retornar GetStatusZipResult', async () => {
      const responseXml = buildSoapResponse('GetStatusZip', '<ZipResult>OK</ZipResult>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new GetStatusZipCommand().execute(services, { trackId: 'Z1' });

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('GetXmlByDocumentKeyCommand', () => {
    it('debería firmar SOAP y retornar GetXmlByDocumentKeyResult', async () => {
      const responseXml = buildSoapResponse('GetXmlByDocumentKey', '<DocXml>...</DocXml>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new GetXmlByDocumentKeyCommand().execute(services, { trackId: 'DK1' });

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('GetNumberingRangeCommand', () => {
    it('debería firmar SOAP y retornar GetNumberingRangeResult', async () => {
      const responseXml = buildSoapResponse('GetNumberingRange', '<Range>1-100</Range>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new GetNumberingRangeCommand().execute(services, {
        accountCode: 'ACC1',
        accountCodeT: 'ACCT1',
        softwareCode: 'SW1',
      });

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('GetExchangeEmailsCommand', () => {
    it('debería firmar SOAP y retornar resultado sin parámetros de entrada', async () => {
      const responseXml = buildSoapResponse('GetExchangeEmails', '<Email>test@test.com</Email>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new GetExchangeEmailsCommand().execute(services, {});

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('GetReferenceNotesCommand', () => {
    it('debería firmar SOAP y retornar GetReferenceNotesResult', async () => {
      const responseXml = buildSoapResponse('GetReferenceNotes', '<Notes>REF</Notes>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new GetReferenceNotesCommand().execute(services, { trackId: 'REF1' });

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('GetAcquirerCommand', () => {
    it('debería firmar SOAP y retornar GetAcquirerResult', async () => {
      const responseXml = buildSoapResponse('GetAcquirer', '<Acquirer>INFO</Acquirer>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new GetAcquirerCommand().execute(services, {
        identificationType: 'NIT',
        identificationNumber: '900373115',
      });

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Comandos de envío (firman UBL + SOAP)
// ---------------------------------------------------------------------------

describe('Comandos de envío — UBL + SOAP signing', () => {

  describe('SendBillSyncCommand', () => {
    it('debería firmar UBL, luego SOAP, y enviar', async () => {
      const responseXml = buildSoapResponse('SendBillSync', '<IsValid>true</IsValid>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new SendBillSyncCommand().execute(services, {
        fileName: 'factura.xml',
        unsignedUblXml: '<Invoice>...</Invoice>',
      });

      // Primero firma el UBL con xmlSigner
      expect(mocks.xmlSign).toHaveBeenCalledTimes(1);
      expect(mocks.xmlSign).toHaveBeenCalledWith(
        '<Invoice>...</Invoice>',
        services.certificateData,
        expect.any(String),
        expect.any(String),
      );
      // Luego firma el SOAP con soapSigner
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      // Envía el mensaje firmado
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('el contenido SOAP debe incluir el UBL firmado en base64', async () => {
      const responseXml = buildSoapResponse('SendBillSync', '<OK/>');
      const { services, mocks } = createMockServices(responseXml);

      await new SendBillSyncCommand().execute(services, {
        fileName: 'test.xml',
        unsignedUblXml: '<Invoice>test</Invoice>',
      });

      // soapSign recibe el SOAP sin firmar que contiene el UBL en base64
      const soapInput = mocks.soapSign.mock.calls[0][0];
      // El UBL firmado fue "<SignedXML><Invoice>test</Invoice></SignedXML>"
      // codificado en base64 dentro de la plantilla SOAP
      const expectedB64 = Buffer.from('<SignedXML><Invoice>test</Invoice></SignedXML>').toString('base64');
      expect(soapInput).toContain(expectedB64);
    });
  });

  describe('SendBillAsyncCommand', () => {
    it('debería firmar UBL con xmlSigner, luego SOAP, y enviar', async () => {
      const responseXml = buildSoapResponse('SendBillAsync', '<ZipKey>ABC123</ZipKey>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new SendBillAsyncCommand().execute(services, {
        fileName: 'async_factura.xml',
        unsignedUblXml: '<Invoice>async</Invoice>',
      });

      expect(mocks.xmlSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('SendBillAttachmentAsyncCommand', () => {
    it('debería firmar AttachedDocument con xmlSigner, luego SOAP', async () => {
      const responseXml = buildSoapResponse('SendBillAttachmentAsync', '<ZipKey>ATT1</ZipKey>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new SendBillAttachmentAsyncCommand().execute(services, {
        fileName: 'attached.xml',
        unsignedAttachedDocumentXml: '<AttachedDocument>doc</AttachedDocument>',
      });

      expect(mocks.xmlSign).toHaveBeenCalledTimes(1);
      expect(mocks.xmlSign).toHaveBeenCalledWith(
        '<AttachedDocument>doc</AttachedDocument>',
        services.certificateData,
        expect.any(String),
        expect.any(String),
      );
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('SendEventCommand', () => {
    it('debería firmar evento con xmlSigner, luego SOAP', async () => {
      const responseXml = buildSoapResponse('SendEventUpdateStatus', '<StatusCode>00</StatusCode>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new SendEventCommand().execute(services, {
        unsignedEventXml: '<ApplicationResponse>evt</ApplicationResponse>',
      });

      expect(mocks.xmlSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('SendNominaSyncCommand', () => {
    it('debería firmar nómina con payrollSigner (NO xmlSigner)', async () => {
      const responseXml = buildSoapResponse('SendNominaSync', '<StatusCode>00</StatusCode>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new SendNominaSyncCommand().execute(services, {
        unsignedPayrollXml: '<NominaIndividual>payroll</NominaIndividual>',
      });

      // Nómina usa payrollSigner, NO xmlSigner
      expect(mocks.payrollSign).toHaveBeenCalledTimes(1);
      expect(mocks.payrollSign).toHaveBeenCalledWith(
        '<NominaIndividual>payroll</NominaIndividual>',
        services.certificateData,
        expect.any(String),
        expect.any(String),
      );
      expect(mocks.xmlSign).not.toHaveBeenCalled();
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('SendTestSetAsyncCommand', () => {
    it('debería firmar SOAP (sin firmar UBL) y enviar test set', async () => {
      const responseXml = buildSoapResponse('SendTestSetAsync', '<ZipKey>TS1</ZipKey>');
      const { services, mocks } = createMockServices(responseXml);

      const result = await new SendTestSetAsyncCommand().execute(services, {
        fileName: 'testset.xml',
        contentFile: Buffer.from('<Invoice>test-set</Invoice>').toString('base64'),
        testSetId: 'TST-SET-001',
      });

      // SendTestSetAsync NO firma UBL — solo firma SOAP
      expect(mocks.xmlSign).not.toHaveBeenCalled();
      expect(mocks.payrollSign).not.toHaveBeenCalled();
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapPost).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Verificación cruzada de patrones
// ---------------------------------------------------------------------------

describe('Comandos — patrones comunes', () => {
  it('todos los comandos de consulta usan solo soapSigner', async () => {
    const queryCommands = [
      { cmd: new GetStatusCommand(), params: { trackId: 'T1' } },
      { cmd: new GetStatusZipCommand(), params: { trackId: 'Z1' } },
      { cmd: new GetXmlByDocumentKeyCommand(), params: { trackId: 'DK1' } },
      { cmd: new GetReferenceNotesCommand(), params: { trackId: 'R1' } },
      { cmd: new GetExchangeEmailsCommand(), params: {} },
      { cmd: new GetAcquirerCommand(), params: { identificationType: 'NIT', identificationNumber: '900373115' } },
      { cmd: new GetNumberingRangeCommand(), params: { accountCode: 'A', accountCodeT: 'B', softwareCode: 'C' } },
    ];

    for (const { cmd, params } of queryCommands) {
      const responseXml = buildSoapResponse('GetStatus', '<OK/>');
      const { services, mocks } = createMockServices(responseXml);
      await cmd.execute(services, params as any);

      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.xmlSign).not.toHaveBeenCalled();
      expect(mocks.payrollSign).not.toHaveBeenCalled();
    }
  });

  it('los comandos de envío de facturas/notas usan xmlSigner + soapSigner', async () => {
    const sendCommands = [
      { cmd: new SendBillSyncCommand(), params: { fileName: 'f.xml', unsignedUblXml: '<Invoice/>' } },
      { cmd: new SendBillAsyncCommand(), params: { fileName: 'f.xml', unsignedUblXml: '<Invoice/>' } },
      { cmd: new SendEventCommand(), params: { unsignedEventXml: '<ApplicationResponse/>' } },
      {
        cmd: new SendBillAttachmentAsyncCommand(),
        params: { fileName: 'a.xml', unsignedAttachedDocumentXml: '<AttachedDocument/>' },
      },
    ];

    for (const { cmd, params } of sendCommands) {
      const responseXml = buildSoapResponse('SendBillSync', '<OK/>');
      const { services, mocks } = createMockServices(responseXml);
      await cmd.execute(services, params as any);

      expect(mocks.xmlSign).toHaveBeenCalledTimes(1);
      expect(mocks.soapSign).toHaveBeenCalledTimes(1);
      expect(mocks.payrollSign).not.toHaveBeenCalled();
    }
  });

  it('SendNominaSync es el único que usa payrollSigner', async () => {
    const responseXml = buildSoapResponse('SendNominaSync', '<OK/>');
    const { services, mocks } = createMockServices(responseXml);
    await new SendNominaSyncCommand().execute(services, { unsignedPayrollXml: '<NominaIndividual/>' });

    expect(mocks.payrollSign).toHaveBeenCalledTimes(1);
    expect(mocks.xmlSign).not.toHaveBeenCalled();
  });

  it('los comandos deben usar el environment para resolver la URL', async () => {
    const responseXml = buildSoapResponse('GetStatus', '<OK/>');
    const { services, mocks } = createMockServices(responseXml);
    services.environment = 1; // Producción

    await new GetStatusCommand().execute(services, { trackId: 'T1' });

    // soapSigner.sign debe recibir la URL de producción
    expect(mocks.soapSign).toHaveBeenCalledWith(
      expect.any(String),
      services.certificateData,
      expect.any(String),
      expect.stringContaining('vpfe.dian.gov.co'),
    );
  });
});
