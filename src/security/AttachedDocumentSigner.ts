import { BaseXmlSigner } from './BaseXmlSigner';
import { DocumentType, DOCUMENT_TYPE_CONFIG } from '../ubl/models';

/**
 * Firmante especializado para documentos AttachedDocument (Documento Adjunto).
 *
 * Diferencias clave con XmlSigner:
 * - Usa ExtensionContent[0] en vez de ExtensionContent[1] para ubicar la firma.
 * - Incluye namespace exclusivo `xmlns:ccts`.
 * - No incluye `xmlns:sts` ni `xmlns:xsi`.
 *
 * Réplica de SignAttachedDocument.php.
 */
export class AttachedDocumentSigner extends BaseXmlSigner {
  private readonly config = DOCUMENT_TYPE_CONFIG[DocumentType.AttachedDocument];

  /**
   * Retorna la configuración del tipo de documento AttachedDocument.
   */
  public getDocumentConfig() {
    return this.config;
  }

  /**
   * Sobreescribe la ubicación de la firma para usar ExtensionContent[0]
   * en vez del [1] usado por los documentos UBL estándar.
   */
  protected override getExtensionContentIndex(): number {
    return 0;
  }
}
