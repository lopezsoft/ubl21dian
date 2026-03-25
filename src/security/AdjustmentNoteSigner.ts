import { BaseXmlSigner } from './BaseXmlSigner';
import { DocumentType, DOCUMENT_TYPE_CONFIG } from '../ubl/models';

/**
 * Firmante especializado para Notas de Ajuste (AdjustmentNote / Nota de Ajuste al Documento Soporte).
 *
 * Diferencias clave con DocumentSupportSigner:
 * - Usa `xmlns:sts = 'http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures'` (URL, no URN).
 *   Esto es intencional y replica SignAdjustmentNote.php — a diferencia de DocumentSupport,
 *   la nota de ajuste usa los mismos namespaces base de facturas/notas crédito.
 * - El root element es `<CreditNote>`.
 *
 * Réplica de SignAdjustmentNote.php (extends SignDocumentSupport).
 */
export class AdjustmentNoteSigner extends BaseXmlSigner {
  private readonly config = DOCUMENT_TYPE_CONFIG[DocumentType.AdjustmentNote];

  public getDocumentConfig() {
    return this.config;
  }
}
