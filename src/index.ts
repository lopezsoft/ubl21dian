export { DianClient } from './DianClient';

// UBL — Modelos y extensiones DIAN
export { DocumentType, DOCUMENT_TYPE_CONFIG, detectDocumentType, detectDocumentTypeFromDom } from './ubl/models';
export type { IDocumentTypeConfig } from './ubl/models';
export {
  truncateDecimals,
  softwareSecurityCode,
  calculateCufe,
  calculateCude,
  calculateCuds,
  calculateCune,
  calculateCudeEvent,
  injectUuid,
  injectCune,
  injectCudeEvent,
  injectSoftwareSecurityCode,
  injectPayrollSoftwareSecurityCode,
  getQRDataInvoice,
  getQRDataPayroll,
} from './ubl/DianExtensions';
export type { IUuidInjectionOptions } from './ubl/DianExtensions';

// Security
export { BaseXmlSigner, ALGO_SHA1, ALGO_SHA256, ALGO_SHA512 } from './security/BaseXmlSigner';
export type { ISignatureAlgorithm } from './security/BaseXmlSigner';
export { XmlSigner } from './security/XmlSigner';
export { PayrollSigner } from './security/PayrollSigner';
export { AttachedDocumentSigner } from './security/AttachedDocumentSigner';
export { DocumentSupportSigner } from './security/DocumentSupportSigner';
export { AdjustmentNoteSigner } from './security/AdjustmentNoteSigner';
export { SoapSigner } from './security/SoapSigner';
export { Certificate } from './security/Certificate';

// Commands
export * from './commands';