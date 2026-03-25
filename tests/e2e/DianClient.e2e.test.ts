import { DianClient } from '../../src/DianClient';
import { GetStatusCommand } from '../../src/commands/GetStatusCommand';
import { SendBillSyncCommand } from '../../src/commands/SendBillSyncCommand';
import { SendNominaSyncCommand } from '../../src/commands/SendNominaSyncCommand';

// ---------------------------------------------------------------------------
// Mock de SoapClient.post para interceptar la llamada HTTP
// ---------------------------------------------------------------------------

const MOCK_RESPONSE_ENVELOPE = `<?xml version="1.0" encoding="UTF-8"?>
<Envelope>
  <Body>
    <GetStatusResponse>
      <GetStatusResult>
        <IsValid>true</IsValid>
        <StatusCode>00</StatusCode>
        <StatusDescription>Procesado Correctamente</StatusDescription>
      </GetStatusResult>
    </GetStatusResponse>
  </Body>
</Envelope>`;

const MOCK_SEND_BILL_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<Envelope>
  <Body>
    <SendBillSyncResponse>
      <SendBillSyncResult>
        <IsValid>true</IsValid>
        <StatusCode>00</StatusCode>
        <XmlDocumentKey>abc123</XmlDocumentKey>
      </SendBillSyncResult>
    </SendBillSyncResponse>
  </Body>
</Envelope>`;

const MOCK_SEND_NOMINA_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<Envelope>
  <Body>
    <SendNominaSyncResponse>
      <SendNominaSyncResult>
        <IsValid>true</IsValid>
        <StatusCode>00</StatusCode>
      </SendNominaSyncResult>
    </SendNominaSyncResponse>
  </Body>
</Envelope>`;

// ---------------------------------------------------------------------------
// Tests E2E — DianClient flujo completo con mocks
// ---------------------------------------------------------------------------

describe('E2E — DianClient flujo completo', () => {
  let client: DianClient;

  beforeAll(() => {
    client = new DianClient({ environment: 2 });
  });

  it('execute() sin inicializar debe lanzar error', async () => {
    const command = new GetStatusCommand();
    await expect(client.execute(command, { trackId: 'test' }))
      .rejects.toThrow('El cliente no ha sido inicializado');
  });

  it('constructor debe crear el cliente con environment correcto', () => {
    expect(client.options.environment).toBe(2);
  });
});

describe('E2E — DianClient con servicios mockeados', () => {
  let client: DianClient;

  beforeEach(() => {
    client = new DianClient({ environment: 2 });
    // Mock initialize — inyectar certificateData y marcar como inicializado
    (client as any).isInitialized = true;
    (client as any).services.certificateData = {
      privateKeyPem: 'mock-private-key',
      publicKeyPem: 'mock-public-key',
      x509CertificateBase64: 'mock-cert-base64',
    };
    // Mock signers — devuelven el XML sin modificar para simplificar
    (client as any).services.soapSigner = {
      sign: (xml: string) => xml,
    };
    (client as any).services.xmlSigner = {
      sign: (xml: string) => xml,
    };
    (client as any).services.payrollSigner = {
      sign: (xml: string) => xml,
    };
  });

  it('GetStatusCommand debe retornar resultado parseado', async () => {
    (client as any).services.soapClient = {
      post: jest.fn().mockResolvedValue(MOCK_RESPONSE_ENVELOPE),
    };

    const command = new GetStatusCommand();
    const result = await client.execute(command, { trackId: 'track-123' });

    expect(result).toBeDefined();
    expect(result.IsValid).toBe(true);
    expect(result.StatusCode).toBe(0); // fast-xml-parser parsea '00' como número
    expect(result.StatusDescription).toBe('Procesado Correctamente');
    expect((client as any).services.soapClient.post).toHaveBeenCalledTimes(1);
  });

  it('SendBillSyncCommand debe firmar UBL, generar SOAP y retornar resultado', async () => {
    (client as any).services.soapClient = {
      post: jest.fn().mockResolvedValue(MOCK_SEND_BILL_RESPONSE),
    };

    const command = new SendBillSyncCommand();
    const result = await client.execute(command, {
      fileName: 'fv-001.xml',
      unsignedUblXml: '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID>FV-001</cbc:ID></Invoice>',
    });

    expect(result).toBeDefined();
    expect(result.IsValid).toBe(true);
    expect(result.XmlDocumentKey).toBe('abc123');
  });

  it('SendNominaSyncCommand debe usar payrollSigner y retornar resultado', async () => {
    const payrollSignSpy = jest.fn().mockImplementation((xml: string) => xml);
    (client as any).services.payrollSigner = { sign: payrollSignSpy };
    (client as any).services.soapClient = {
      post: jest.fn().mockResolvedValue(MOCK_SEND_NOMINA_RESPONSE),
    };

    const command = new SendNominaSyncCommand();
    const result = await client.execute(command, {
      unsignedPayrollXml: '<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"><ID>N-001</ID></NominaIndividual>',
    });

    expect(result).toBeDefined();
    expect(result.IsValid).toBe(true);
    expect(payrollSignSpy).toHaveBeenCalledTimes(1);
  });

  it('el mock de soapClient.post debe recibir XML con estructura SOAP válida', async () => {
    const postMock = jest.fn().mockResolvedValue(MOCK_RESPONSE_ENVELOPE);
    (client as any).services.soapClient = { post: postMock };

    const command = new GetStatusCommand();
    await client.execute(command, { trackId: 'uuid-test-456' });

    const [sentXml] = postMock.mock.calls[0];
    expect(sentXml).toContain('uuid-test-456');
    expect(sentXml).toContain('soap:Envelope');
  });

  it('command execute debe propagar errores de soapClient', async () => {
    (client as any).services.soapClient = {
      post: jest.fn().mockRejectedValue(new Error('Network error')),
    };

    const command = new GetStatusCommand();
    await expect(client.execute(command, { trackId: 'test' }))
      .rejects.toThrow('Network error');
  });
});
