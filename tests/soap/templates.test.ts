import { SendBillSyncTemplate } from '../../src/soap/templates/SendBillSyncTemplate';
import { SendBillAsyncTemplate } from '../../src/soap/templates/SendBillAsyncTemplate';
import { SendBillAttachmentAsyncTemplate } from '../../src/soap/templates/SendBillAttachmentAsyncTemplate';
import { SendEventTemplate } from '../../src/soap/templates/SendEventTemplate';
import { SendNominaSyncTemplate } from '../../src/soap/templates/SendNominaSyncTemplate';
import { SendTestSetAsyncTemplate } from '../../src/soap/templates/SendTestSetAsyncTemplate';
import { GetStatusTemplate } from '../../src/soap/templates/GetStatusTemplate';
import { GetStatusZipTemplate } from '../../src/soap/templates/GetStatusZipTemplate';
import { GetStatusEventTemplate } from '../../src/soap/templates/GetStatusEventTemplate';
import { GetNumberingRangeTemplate } from '../../src/soap/templates/GetNumberingRangeTemplate';
import { GetXmlByDocumentKeyTemplate } from '../../src/soap/templates/GetXmlByDocumentKeyTemplate';
import { GetExchangeEmailsTemplate } from '../../src/soap/templates/GetExchangeEmailsTemplate';
import { GetReferenceNotesTemplate } from '../../src/soap/templates/GetReferenceNotesTemplate';
import { GetAcquirerTemplate } from '../../src/soap/templates/GetAcquirerTemplate';

describe('SOAP Templates', () => {

  describe('SendBillSyncTemplate', () => {
    const template = new SendBillSyncTemplate();

    it('debería generar XML con fileName y contentFile', () => {
      const xml = template.getXml({ fileName: 'test.xml', contentFile: 'base64content' });
      expect(xml).toContain('<wcf:SendBillSync>');
      expect(xml).toContain('<wcf:fileName>test.xml</wcf:fileName>');
      expect(xml).toContain('<wcf:contentFile>base64content</wcf:contentFile>');
      expect(xml).toContain('xmlns:soap="http://www.w3.org/2003/05/soap-envelope"');
      expect(xml).toContain('xmlns:wcf="http://wcf.dian.colombia"');
    });

    it('debería lanzar error si falta fileName', () => {
      expect(() => template.getXml({ contentFile: 'base64' } as any)).toThrow();
    });

    it('debería lanzar error si falta contentFile', () => {
      expect(() => template.getXml({ fileName: 'test.xml' } as any)).toThrow();
    });
  });

  describe('SendBillAsyncTemplate', () => {
    const template = new SendBillAsyncTemplate();

    it('debería generar XML con fileName y contentFile', () => {
      const xml = template.getXml({ fileName: 'test.xml', contentFile: 'base64content' });
      expect(xml).toContain('<wcf:SendBillAsync>');
      expect(xml).toContain('<wcf:fileName>test.xml</wcf:fileName>');
      expect(xml).toContain('<wcf:contentFile>base64content</wcf:contentFile>');
    });

    it('debería lanzar error si faltan parámetros', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('SendBillAttachmentAsyncTemplate', () => {
    const template = new SendBillAttachmentAsyncTemplate();

    it('debería generar XML con fileName y contentFile', () => {
      const xml = template.getXml({ fileName: 'attached.xml', contentFile: 'base64content' });
      expect(xml).toContain('<wcf:SendBillAttachmentAsync>');
      expect(xml).toContain('<wcf:fileName>attached.xml</wcf:fileName>');
      expect(xml).toContain('<wcf:contentFile>base64content</wcf:contentFile>');
    });

    it('debería lanzar error si faltan parámetros', () => {
      expect(() => template.getXml({ fileName: 'test.xml' } as any)).toThrow();
    });
  });

  describe('SendEventTemplate', () => {
    const template = new SendEventTemplate();

    it('debería generar XML con contentFile', () => {
      const xml = template.getXml({ contentFile: 'eventBase64' });
      expect(xml).toContain('<wcf:SendEventUpdateStatus>');
      expect(xml).toContain('<wcf:contentFile>eventBase64</wcf:contentFile>');
    });

    it('debería lanzar error si falta contentFile', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('SendNominaSyncTemplate', () => {
    const template = new SendNominaSyncTemplate();

    it('debería generar XML con contentFile', () => {
      const xml = template.getXml({ contentFile: 'nominaBase64' });
      expect(xml).toContain('<wcf:SendNominaSync>');
      expect(xml).toContain('<wcf:contentFile>nominaBase64</wcf:contentFile>');
    });

    it('debería lanzar error si falta contentFile', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('SendTestSetAsyncTemplate', () => {
    const template = new SendTestSetAsyncTemplate();

    it('debería generar XML con fileName, contentFile y testSetId', () => {
      const xml = template.getXml({
        fileName: 'testset.zip',
        contentFile: 'zipBase64',
        testSetId: 'TST-12345',
      });
      expect(xml).toContain('<wcf:SendTestSetAsync>');
      expect(xml).toContain('<wcf:fileName>testset.zip</wcf:fileName>');
      expect(xml).toContain('<wcf:contentFile>zipBase64</wcf:contentFile>');
      expect(xml).toContain('<wcf:testSetId>TST-12345</wcf:testSetId>');
    });

    it('debería lanzar error si falta testSetId', () => {
      expect(() => template.getXml({ fileName: 'test.zip', contentFile: 'base64' } as any)).toThrow();
    });
  });

  describe('GetStatusTemplate', () => {
    const template = new GetStatusTemplate();

    it('debería generar XML con trackId', () => {
      const xml = template.getXml({ trackId: 'abc-123' });
      expect(xml).toContain('<wcf:GetStatus>');
      expect(xml).toContain('<wcf:trackId>abc-123</wcf:trackId>');
    });

    it('debería lanzar error si falta trackId', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('GetStatusZipTemplate', () => {
    const template = new GetStatusZipTemplate();

    it('debería generar XML con trackId', () => {
      const xml = template.getXml({ trackId: 'zip-456' });
      expect(xml).toContain('<wcf:GetStatusZip>');
      expect(xml).toContain('<wcf:trackId>zip-456</wcf:trackId>');
    });

    it('debería lanzar error si falta trackId', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('GetStatusEventTemplate', () => {
    const template = new GetStatusEventTemplate();

    it('debería generar XML con trackId', () => {
      const xml = template.getXml({ trackId: 'evt-789' });
      expect(xml).toContain('<wcf:GetStatusEvent>');
      expect(xml).toContain('<wcf:trackId>evt-789</wcf:trackId>');
    });

    it('debería lanzar error si falta trackId', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('GetNumberingRangeTemplate', () => {
    const template = new GetNumberingRangeTemplate();

    it('debería generar XML con accountCode, accountCodeT y softwareCode', () => {
      const xml = template.getXml({
        accountCode: '900123456',
        accountCodeT: '900654321',
        softwareCode: 'SW-001',
      });
      expect(xml).toContain('<wcf:GetNumberingRange>');
      expect(xml).toContain('<wcf:accountCode>900123456</wcf:accountCode>');
      expect(xml).toContain('<wcf:accountCodeT>900654321</wcf:accountCodeT>');
      expect(xml).toContain('<wcf:softwareCode>SW-001</wcf:softwareCode>');
    });

    it('debería lanzar error si faltan parámetros', () => {
      expect(() => template.getXml({ accountCode: '900123456' } as any)).toThrow();
    });
  });

  describe('GetXmlByDocumentKeyTemplate', () => {
    const template = new GetXmlByDocumentKeyTemplate();

    it('debería generar XML con trackId', () => {
      const xml = template.getXml({ trackId: 'doc-key-123' });
      expect(xml).toContain('<wcf:GetXmlByDocumentKey>');
      expect(xml).toContain('<wcf:trackId>doc-key-123</wcf:trackId>');
    });

    it('debería lanzar error si falta trackId', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('GetExchangeEmailsTemplate', () => {
    const template = new GetExchangeEmailsTemplate();

    it('debería generar XML sin parámetros', () => {
      const xml = template.getXml();
      expect(xml).toContain('<wcf:GetExchangeEmails/>');
      expect(xml).toContain('xmlns:soap="http://www.w3.org/2003/05/soap-envelope"');
    });
  });

  describe('GetReferenceNotesTemplate', () => {
    const template = new GetReferenceNotesTemplate();

    it('debería generar XML con trackId', () => {
      const xml = template.getXml({ trackId: 'ref-note-001' });
      expect(xml).toContain('<wcf:GetReferenceNotes>');
      expect(xml).toContain('<wcf:trackId>ref-note-001</wcf:trackId>');
    });

    it('debería lanzar error si falta trackId', () => {
      expect(() => template.getXml({} as any)).toThrow();
    });
  });

  describe('GetAcquirerTemplate', () => {
    const template = new GetAcquirerTemplate();

    it('debería generar XML con identificationType e identificationNumber', () => {
      const xml = template.getXml({
        identificationType: '31',
        identificationNumber: '900123456',
      });
      expect(xml).toContain('<wcf:GetAcquirer>');
      expect(xml).toContain('<wcf:identificationType>31</wcf:identificationType>');
      expect(xml).toContain('<wcf:identificationNumber>900123456</wcf:identificationNumber>');
    });

    it('debería lanzar error si faltan parámetros', () => {
      expect(() => template.getXml({ identificationType: '31' } as any)).toThrow();
    });
  });

  describe('Estructura SOAP común', () => {
    it('todas las plantillas Send* deben incluir soap:Header', () => {
      const templates = [
        new SendBillSyncTemplate().getXml({ fileName: 'f', contentFile: 'c' }),
        new SendBillAsyncTemplate().getXml({ fileName: 'f', contentFile: 'c' }),
        new SendBillAttachmentAsyncTemplate().getXml({ fileName: 'f', contentFile: 'c' }),
        new SendEventTemplate().getXml({ contentFile: 'c' }),
        new SendNominaSyncTemplate().getXml({ contentFile: 'c' }),
        new SendTestSetAsyncTemplate().getXml({ fileName: 'f', contentFile: 'c', testSetId: 't' }),
      ];

      templates.forEach(xml => {
        expect(xml).toContain('<soap:Header/>');
        expect(xml).toContain('<soap:Body>');
        expect(xml).toContain('<soap:Envelope');
      });
    });
  });
});
