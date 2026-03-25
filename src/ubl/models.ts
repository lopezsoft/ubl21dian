import type { Document as XmlDocument } from '@xmldom/xmldom';

/**
 * Tipos de documento electrónico soportados por la DIAN colombiana.
 */
export enum DocumentType {
  Invoice = 'Invoice',
  CreditNote = 'CreditNote',
  DebitNote = 'DebitNote',
  ApplicationResponse = 'ApplicationResponse',
  Payroll = 'Payroll',
  PayrollAdjustment = 'PayrollAdjustment',
  AttachedDocument = 'AttachedDocument',
  DocumentSupport = 'DocumentSupport',
  AdjustmentNote = 'AdjustmentNote',
}

/**
 * Configuración de namespaces y metadatos asociados a cada tipo de documento.
 */
export interface IDocumentTypeConfig {
  type: DocumentType;
  ns: Record<string, string>;
  groupOfTotals: string;
  rootElement: string;
}

/**
 * Namespaces base compartidos por todos los documentos UBL (Invoice, CreditNote, DebitNote, etc.).
 * Replica exactamente los namespaces del array $ns de SignInvoice.php.
 */
const BASE_UBL_NS: Record<string, string> = {
  'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  'xmlns:sts': 'http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures',
  'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  'xmlns:xades141': 'http://uri.etsi.org/01903/v1.4.1#',
  'xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
  'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
};

/**
 * Mapa de configuración por tipo de documento.
 * Cada entrada refleja exactamente los namespaces y metadatos de las clases PHP correspondientes:
 * - Invoice      → SignInvoice.php ($ns, groupOfTotals = 'LegalMonetaryTotal')
 * - CreditNote   → SignCreditNote.php (solo cambia xmlns principal)
 * - DebitNote     → SignDebitNote.php (cambia xmlns + groupOfTotals = 'RequestedMonetaryTotal')
 * - ApplicationResponse → SignEvent.php (cambia xmlns:sts + xmlns principal)
 * - Payroll       → SignPayroll.php (namespaces completamente diferentes)
 * - PayrollAdjustment → SignPayrollAdjustment.php
 * - AttachedDocument → SignAttachedDocument.php
 * - DocumentSupport → SignDocumentSupport.php (xmlns:sts usa URN)
 * - AdjustmentNote → SignAdjustmentNote.php
 */
export const DOCUMENT_TYPE_CONFIG: Record<string, IDocumentTypeConfig> = {
  [DocumentType.Invoice]: {
    type: DocumentType.Invoice,
    ns: {
      ...BASE_UBL_NS,
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    },
    groupOfTotals: 'LegalMonetaryTotal',
    rootElement: 'Invoice',
  },
  [DocumentType.CreditNote]: {
    type: DocumentType.CreditNote,
    ns: {
      ...BASE_UBL_NS,
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
    },
    groupOfTotals: 'LegalMonetaryTotal',
    rootElement: 'CreditNote',
  },
  [DocumentType.DebitNote]: {
    type: DocumentType.DebitNote,
    ns: {
      ...BASE_UBL_NS,
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2',
    },
    groupOfTotals: 'RequestedMonetaryTotal',
    rootElement: 'DebitNote',
  },
  [DocumentType.ApplicationResponse]: {
    type: DocumentType.ApplicationResponse,
    ns: {
      ...BASE_UBL_NS,
      'xmlns:sts': 'dian:gov:co:facturaelectronica:Structures-2-1',
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2',
    },
    groupOfTotals: '',
    rootElement: 'ApplicationResponse',
  },
  [DocumentType.Payroll]: {
    type: DocumentType.Payroll,
    ns: {
      'xmlns': 'dian:gov:co:facturaelectronica:NominaIndividual',
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',
    },
    groupOfTotals: '',
    rootElement: 'NominaIndividual',
  },
  [DocumentType.PayrollAdjustment]: {
    type: DocumentType.PayrollAdjustment,
    ns: {
      'xmlns': 'urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste',
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',
    },
    groupOfTotals: '',
    rootElement: 'NominaIndividualDeAjuste',
  },
  [DocumentType.AttachedDocument]: {
    type: DocumentType.AttachedDocument,
    ns: {
      ...BASE_UBL_NS,
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2',
      'xmlns:ccts': 'urn:un:unece:uncefact:data:specification:CoreComponentTypeSchemaModule:2',
    },
    groupOfTotals: '',
    rootElement: 'AttachedDocument',
  },
  [DocumentType.DocumentSupport]: {
    type: DocumentType.DocumentSupport,
    ns: {
      ...BASE_UBL_NS,
      'xmlns:sts': 'urn:dian:gov:co:facturaelectronica:Structures-2-1',
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    },
    groupOfTotals: 'LegalMonetaryTotal',
    rootElement: 'Invoice',
  },
  [DocumentType.AdjustmentNote]: {
    type: DocumentType.AdjustmentNote,
    ns: {
      ...BASE_UBL_NS,
      'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
    },
    groupOfTotals: 'LegalMonetaryTotal',
    rootElement: 'CreditNote',
  },
};

/**
 * Detecta el tipo de documento a partir del contenido XML (string).
 * Sigue la misma lógica de detección que el PHP original
 * (verificación de tags de cierre y namespaces).
 *
 * Nota: AdjustmentNote no es distinguible de CreditNote por contenido XML,
 * ya que comparten elemento raíz y namespaces. Use setDocumentType() explícito.
 */
export function detectDocumentType(xml: string): DocumentType {
  if (xml.includes('</AttachedDocument>')) return DocumentType.AttachedDocument;
  if (xml.includes('NominaIndividualDeAjuste')) return DocumentType.PayrollAdjustment;
  if (xml.includes('NominaIndividual')) return DocumentType.Payroll;
  if (xml.includes('</ApplicationResponse>')) return DocumentType.ApplicationResponse;
  if (xml.includes('</CreditNote>')) return DocumentType.CreditNote;
  if (xml.includes('</DebitNote>')) return DocumentType.DebitNote;
  // DocumentSupport usa xmlns:sts URN en lugar de URL (SignDocumentSupport.php)
  if (xml.includes('</Invoice>') && xml.includes('urn:dian:gov:co:facturaelectronica:Structures-2-1')) {
    return DocumentType.DocumentSupport;
  }
  if (xml.includes('</Invoice>')) return DocumentType.Invoice;
  throw new Error('No se pudo detectar el tipo de documento del XML.');
}

/**
 * Detecta el tipo de documento a partir de un DOM Document ya parseado.
 * Usa el nombre del elemento raíz para determinación rápida.
 * Para DocumentSupport se verifica adicionalmente el namespace xmlns:sts URN.
 *
 * Nota: AdjustmentNote no es distinguible de CreditNote por DOM,
 * ya que comparten elemento raíz y namespaces. Use setDocumentType() explícito.
 */
export function detectDocumentTypeFromDom(doc: XmlDocument): DocumentType {
  const rootName = doc.documentElement!.nodeName;
  const localName = rootName.includes(':') ? rootName.split(':')[1] : rootName;

  switch (localName) {
    case 'Invoice': {
      const stsNs = doc.documentElement!.getAttribute('xmlns:sts');
      if (stsNs === 'urn:dian:gov:co:facturaelectronica:Structures-2-1') {
        return DocumentType.DocumentSupport;
      }
      return DocumentType.Invoice;
    }
    case 'CreditNote': return DocumentType.CreditNote;
    case 'DebitNote': return DocumentType.DebitNote;
    case 'ApplicationResponse': return DocumentType.ApplicationResponse;
    case 'NominaIndividual': return DocumentType.Payroll;
    case 'NominaIndividualDeAjuste': return DocumentType.PayrollAdjustment;
    case 'AttachedDocument': return DocumentType.AttachedDocument;
    default: throw new Error(`Tipo de documento no reconocido: ${rootName}`);
  }
}
