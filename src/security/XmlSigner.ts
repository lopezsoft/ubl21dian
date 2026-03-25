import { BaseXmlSigner } from './BaseXmlSigner';
import { DocumentType, DOCUMENT_TYPE_CONFIG, IDocumentTypeConfig, detectDocumentType } from '../ubl/models';

/**
 * Firmante estándar para documentos UBL (Facturas, Notas Crédito, Notas Débito, etc.).
 * Diferencia automáticamente los namespaces por tipo de documento.
 */
export class XmlSigner extends BaseXmlSigner {
  private documentConfig?: IDocumentTypeConfig;

  /**
   * Establece manualmente el tipo de documento para configurar los namespaces.
   */
  public setDocumentType(type: DocumentType): void {
    this.documentConfig = DOCUMENT_TYPE_CONFIG[type];
  }

  /**
   * Retorna la configuración de namespaces del documento actual.
   */
  public getDocumentConfig(): IDocumentTypeConfig | undefined {
    return this.documentConfig;
  }

  /**
   * Pre-procesamiento: detecta automáticamente el tipo de documento
   * del XML para configurar los namespaces correspondientes.
   */
  protected override preSigningTransform(xml: string): string {
    if (!this.documentConfig) {
      const type = detectDocumentType(xml);
      this.documentConfig = DOCUMENT_TYPE_CONFIG[type];
    }
    return xml;
  }
}