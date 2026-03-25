import { BaseXmlSigner } from './BaseXmlSigner';
import { DocumentType, DOCUMENT_TYPE_CONFIG } from '../ubl/models';

/**
 * Firmante especializado para Documento Soporte (DocumentSupport).
 *
 * Diferencias clave con XmlSigner:
 * - Usa `xmlns:sts = 'urn:dian:gov:co:facturaelectronica:Structures-2-1'` (URN, no URL).
 * - El root element es `<Invoice>` igual que una factura, pero se distingue
 *   por el tipo explícito.
 * - Usa ExtensionContent[1] (por defecto de BaseXmlSigner).
 *
 * Réplica de SignDocumentSupport.php.
 */
export class DocumentSupportSigner extends BaseXmlSigner {
  private readonly config = DOCUMENT_TYPE_CONFIG[DocumentType.DocumentSupport];

  public getDocumentConfig() {
    return this.config;
  }
}
