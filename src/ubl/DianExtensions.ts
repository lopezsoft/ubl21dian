import { createHash } from 'crypto';
import { XMLSerializer, Document as XmlDocument } from '@xmldom/xmldom';
import { DocumentType, DOCUMENT_TYPE_CONFIG, detectDocumentType } from './models';
import { QR_DOMAIN_HABILITACION, QR_DOMAIN_PRODUCCION } from '../common/constants';

/** Códigos de otros impuestos para cálculo ValOtroIm en QR de facturas. */
const OTHER_TAX_CODES = [
  '02', '03', '04', '08', '20', '21', '22', '23', '24', '25', '26', 'ZZ', '30', '32', '33', '34', '35', '36',
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Trunca (NO redondea) un valor numérico al número de decimales indicado.
 * Sigue la especificación DIAN para el truncamiento de valores monetarios
 * en los cálculos CUFE/CUDE/CUDS/CUNE.
 *
 * Réplica fiel de `truncateDecimals()` de SignInvoice.php.
 */
export function truncateDecimals(value: number, decimals: number = 2): string {
  const stringValue = value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  const dotPos = stringValue.indexOf('.');
  if (dotPos === -1) {
    return stringValue + '.' + '0'.repeat(decimals);
  }
  const integerPart = stringValue.substring(0, dotPos);
  let decimalPart = stringValue.substring(dotPos + 1);
  if (decimalPart.length < decimals) {
    decimalPart = decimalPart.padEnd(decimals, '0');
  } else {
    decimalPart = decimalPart.substring(0, decimals);
  }
  return integerPart + '.' + decimalPart;
}

// ---------------------------------------------------------------------------
// Helpers DOM (privados)
// ---------------------------------------------------------------------------

/**
 * Obtiene el contenido de texto de un tag XML por su nombre calificado (con prefijo).
 */
function getTagText(doc: XmlDocument, tagName: string, item: number = 0): string {
  const elements = doc.getElementsByTagName(tagName);
  const element = elements.item(item);
  if (!element) {
    throw new Error(`Tag XML no encontrado: ${tagName}`);
  }
  return element.textContent || '';
}

/**
 * Obtiene el valor de un atributo de un elemento XML por nombre de tag.
 * Usado por la nómina (Payroll) donde los datos están en atributos, no nodos de texto.
 */
function getElementAttribute(doc: XmlDocument, tagName: string, attrName: string, fallback?: string): string {
  const element = doc.getElementsByTagName(tagName).item(0);
  if (!element) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Tag XML no encontrado: ${tagName}`);
  }
  const value = (element as any).getAttribute(attrName);
  if (value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Atributo '${attrName}' no encontrado en <${tagName}>`);
  }
  return value;
}

/**
 * Obtiene el texto de un tag, retornando fallback si no existe.
 */
function getTagTextOptional(doc: XmlDocument, tagName: string, fallback: string = ''): string {
  const element = doc.getElementsByTagName(tagName).item(0);
  return element?.textContent?.trim() || fallback;
}

/**
 * Busca el monto de impuesto de un TaxTotal cuyo TaxScheme/ID coincida con `taxCode`.
 * Retorna '0.00' si no se encuentra el código de impuesto.
 *
 * Estructura esperada en el XML:
 * ```xml
 * <cac:TaxTotal>
 *   <cbc:TaxAmount>1900.00</cbc:TaxAmount>
 *   <cac:TaxSubtotal>
 *     <cac:TaxCategory>
 *       <cac:TaxScheme>
 *         <cbc:ID>01</cbc:ID>
 *       </cac:TaxScheme>
 *     </cac:TaxCategory>
 *   </cac:TaxSubtotal>
 * </cac:TaxTotal>
 * ```
 */
function getTaxAmount(doc: XmlDocument, taxCode: string): string {
  const taxTotals = doc.getElementsByTagName('cac:TaxTotal');
  for (let i = 0; i < taxTotals.length; i++) {
    const taxTotal = taxTotals.item(i);
    if (!taxTotal) continue;
    const ids = (taxTotal as any).getElementsByTagName('cbc:ID');
    for (let j = 0; j < ids.length; j++) {
      const idNode = ids.item(j);
      if (!idNode) continue;
      const parent = idNode.parentNode;
      if (parent && parent.nodeName === 'cac:TaxScheme' && (idNode.textContent || '').trim() === taxCode) {
        const taxAmounts = (taxTotal as any).getElementsByTagName('cbc:TaxAmount');
        return taxAmounts.item(0)?.textContent?.trim() || '0.00';
      }
    }
  }
  return '0.00';
}

function getBasicDocumentData(doc: XmlDocument): { id: string; date: string; time: string } {
  return {
    id: getTagText(doc, 'cbc:ID', 0),
    date: getTagText(doc, 'cbc:IssueDate', 0),
    time: getTagText(doc, 'cbc:IssueTime', 0),
  };
}

function getPartyIdentifications(doc: XmlDocument): { supplier: string; customer: string } {
  const supplierParty = doc.getElementsByTagName('cac:AccountingSupplierParty').item(0);
  const customerParty = doc.getElementsByTagName('cac:AccountingCustomerParty').item(0);

  let supplierNit = '';
  let customerNit = '';

  if (supplierParty) {
    const companyIds = (supplierParty as any).getElementsByTagName('cbc:CompanyID');
    supplierNit = companyIds.item(0)?.textContent?.trim() || '';
  }
  if (customerParty) {
    const companyIds = (customerParty as any).getElementsByTagName('cbc:CompanyID');
    customerNit = companyIds.item(0)?.textContent?.trim() || '';
  }

  return { supplier: supplierNit, customer: customerNit };
}

function getLineExtensionAmount(doc: XmlDocument, groupOfTotals: string): string {
  const totals = doc.getElementsByTagName(`cac:${groupOfTotals}`).item(0);
  if (!totals) throw new Error(`Grupo de totales no encontrado: cac:${groupOfTotals}`);
  return (totals as any).getElementsByTagName('cbc:LineExtensionAmount').item(0)?.textContent?.trim() || '0.00';
}

function getPayableAmount(doc: XmlDocument, groupOfTotals: string): string {
  const totals = doc.getElementsByTagName(`cac:${groupOfTotals}`).item(0);
  if (!totals) throw new Error(`Grupo de totales no encontrado: cac:${groupOfTotals}`);
  return (totals as any).getElementsByTagName('cbc:PayableAmount').item(0)?.textContent?.trim() || '0.00';
}

/**
 * Construye la cadena base para CUFE/CUDE de Invoice/CreditNote/DebitNote.
 * Fórmula PHP (buildInvoiceHashString):
 *   ID + Date + Time + LineExtAmt + "01" + Tax01 + "04" + Tax04 + "03" + Tax03 + PayableAmt + SupplierNIT + CustomerNIT
 */
function buildInvoiceHashString(doc: XmlDocument, groupOfTotals: string): string {
  const basic = getBasicDocumentData(doc);
  const parties = getPartyIdentifications(doc);
  const lineExtension = getLineExtensionAmount(doc, groupOfTotals);
  const payableAmount = getPayableAmount(doc, groupOfTotals);
  const tax01 = getTaxAmount(doc, '01');
  const tax04 = getTaxAmount(doc, '04');
  const tax03 = getTaxAmount(doc, '03');

  return `${basic.id}${basic.date}${basic.time}${lineExtension}01${tax01}04${tax04}03${tax03}${payableAmount}${parties.supplier}${parties.customer}`;
}

/**
 * Construye la cadena base para CUDS de Documento Soporte / Nota de Ajuste.
 * Fórmula PHP (buildDocumentSupportHashString):
 *   ID + Date + Time + LineExtAmt + "01" + Tax01 + PayableAmt + SupplierNIT + CustomerNIT
 *
 * Diferencia con CUFE/CUDE: solo incluye impuesto 01 (IVA), no 04 ni 03.
 */
function buildDocumentSupportHashString(doc: XmlDocument, groupOfTotals: string): string {
  const basic = getBasicDocumentData(doc);
  const parties = getPartyIdentifications(doc);
  const lineExtension = getLineExtensionAmount(doc, groupOfTotals);
  const payableAmount = getPayableAmount(doc, groupOfTotals);
  const tax01 = getTaxAmount(doc, '01');

  return `${basic.id}${basic.date}${basic.time}${lineExtension}01${tax01}${payableAmount}${parties.supplier}${parties.customer}`;
}

// ---------------------------------------------------------------------------
// Funciones públicas — Cálculos DIAN
// ---------------------------------------------------------------------------

/**
 * Calcula el SoftwareSecurityCode según especificación DIAN.
 * Fórmula: SHA384(softwareID + pin + documentID)
 *
 * Réplica de `softwareSecurityCode()` de SignInvoice.php.
 */
export function softwareSecurityCode(softwareID: string, pin: string, documentID: string): string {
  return createHash('sha384').update(`${softwareID}${pin}${documentID}`).digest('hex');
}

/**
 * Calcula el CUFE (Código Único de Factura Electrónica).
 * Usado exclusivamente para facturas electrónicas (con technicalKey).
 *
 * Fórmula: SHA384(baseString + technicalKey + ProfileExecutionID)
 * Donde baseString = ID + Date + Time + LineExtAmt + "01" + Tax01 + "04" + Tax04 + "03" + Tax03 + PayableAmt + SupplierNIT + CustomerNIT
 *
 * Réplica de `cufe()` de SignInvoice.php.
 */
export function calculateCufe(doc: XmlDocument, technicalKey: string, groupOfTotals: string = 'LegalMonetaryTotal'): string {
  const baseString = buildInvoiceHashString(doc, groupOfTotals);
  const profileId = getTagText(doc, 'cbc:ProfileExecutionID', 0);
  return createHash('sha384').update(`${baseString}${technicalKey}${profileId}`).digest('hex');
}

/**
 * Calcula el CUDE (Código Único de Documento Electrónico).
 * Usado para notas crédito, notas débito y documentos soporte.
 *
 * Fórmula: SHA384(baseString + pin + ProfileExecutionID)
 * Idéntico al CUFE pero usa `pin` en vez de `technicalKey`.
 *
 * Réplica de `cude()` de SignInvoice.php.
 */
export function calculateCude(doc: XmlDocument, pin: string, groupOfTotals: string = 'LegalMonetaryTotal'): string {
  const baseString = buildInvoiceHashString(doc, groupOfTotals);
  const profileId = getTagText(doc, 'cbc:ProfileExecutionID', 0);
  return createHash('sha384').update(`${baseString}${pin}${profileId}`).digest('hex');
}

/**
 * Calcula el CUDS (Código Único de Documento Soporte).
 * Usado para documentos soporte y notas de ajuste al documento soporte.
 *
 * Fórmula: SHA384(ID + Date + Time + LineExtAmt + "01" + Tax01 + PayableAmt
 *          + SupplierNIT + CustomerNIT + pin + ProfileExecutionID)
 *
 * A diferencia del CUFE/CUDE, el CUDS solo incluye el impuesto 01 (IVA).
 * NO concatena los códigos "04", "03" ni sus montos.
 *
 * Réplica de `cuds()` de SignDocumentSupport.php.
 */
export function calculateCuds(doc: XmlDocument, pin: string, groupOfTotals: string = 'LegalMonetaryTotal'): string {
  const baseString = buildDocumentSupportHashString(doc, groupOfTotals);
  const profileId = getTagText(doc, 'cbc:ProfileExecutionID', 0);
  return createHash('sha384').update(`${baseString}${pin}${profileId}`).digest('hex');
}

// ---------------------------------------------------------------------------
// Funciones públicas — Inyección en documento XML
// ---------------------------------------------------------------------------

export interface IUuidInjectionOptions {
  technicalKey?: string;
  pin?: string;
  /** Tipo de documento explícito. Si no se provee, se auto-detecta del XML. */
  documentType?: DocumentType;
}

/**
 * Determina si usar CUFE, CUDE o CUDS, calcula el hash, lo inyecta en `<cbc:UUID>`,
 * y actualiza la URL del QR code.
 *
 * Lógica de decisión (réplica de `setUUID()` de SignInvoice.php / SignDocumentSupport.php):
 * - Si hay `technicalKey` → CUFE (factura electrónica)
 * - Si solo hay `pin`:
 *   - DocumentSupport / AdjustmentNote → CUDS
 *   - CreditNote / DebitNote / Invoice → CUDE
 *
 * @returns El UUID calculado (hash hex de 96 caracteres).
 */
export function injectUuid(doc: XmlDocument, options: IUuidInjectionOptions): string {
  const xmlStr = new XMLSerializer().serializeToString(doc as any);
  const docType = options.documentType ?? detectDocumentType(xmlStr);
  const config = DOCUMENT_TYPE_CONFIG[docType];

  if (docType === DocumentType.ApplicationResponse) {
    throw new Error('Para ApplicationResponse use una función de CUDE-EVENT dedicada.');
  }

  const useCuds = docType === DocumentType.DocumentSupport || docType === DocumentType.AdjustmentNote;

  let uuid: string;
  if (options.technicalKey) {
    uuid = calculateCufe(doc, options.technicalKey, config.groupOfTotals);
  } else if (options.pin) {
    uuid = useCuds
      ? calculateCuds(doc, options.pin, config.groupOfTotals)
      : calculateCude(doc, options.pin, config.groupOfTotals);
  } else {
    throw new Error('Se requiere technicalKey o pin para calcular el UUID.');
  }

  const uuidElement = doc.getElementsByTagName('cbc:UUID').item(0);
  if (uuidElement) {
    uuidElement.textContent = uuid;
  }

  const profileExecutionId = getTagText(doc, 'cbc:ProfileExecutionID', 0);
  const qrDomain = profileExecutionId === '2' ? QR_DOMAIN_HABILITACION : QR_DOMAIN_PRODUCCION;
  const qrElement = doc.getElementsByTagName('sts:QRCode').item(0)
    || doc.getElementsByTagName('cbc:QRCode').item(0);
  if (qrElement) {
    qrElement.textContent = `https://${qrDomain}/document/searchqr?documentkey=${uuid}`;
  }

  return uuid;
}

/**
 * Calcula e inyecta el SoftwareSecurityCode en el elemento `<sts:SoftwareSecurityCode>`.
 * Fórmula: SHA384(softwareID + pin + documentID)
 *
 * Réplica de `softwareSecurityCode()` de SignInvoice.php.
 *
 * @returns El código de seguridad calculado.
 */
export function injectSoftwareSecurityCode(doc: XmlDocument, softwareID: string, pin: string): string {
  const docId = getTagText(doc, 'cbc:ID', 0);
  const securityCode = softwareSecurityCode(softwareID, pin, docId);
  const sscElement = doc.getElementsByTagName('sts:SoftwareSecurityCode').item(0);
  if (sscElement) {
    sscElement.textContent = securityCode;
  }
  return securityCode;
}

// ---------------------------------------------------------------------------
// Funciones públicas — CUNE (Nómina / Payroll)
// ---------------------------------------------------------------------------

/**
 * Calcula el CUNE (Código Único de Nómina Electrónica).
 * Fórmula: SHA384(Numero + FechaGen + HoraGen + DevengadosTotal + DeduccionesTotal
 *          + ComprobanteTotal + NIT + NumeroDocumento + TipoXML + pin + Ambiente)
 *
 * Diferencias clave con CUFE/CUDE:
 * - Usa atributos XML en vez de nodos de texto (nómina DIAN).
 * - DevengadosTotal, DeduccionesTotal, ComprobanteTotal se truncan a 2 decimales.
 *
 * Réplica de `getCUNE()` de SignPayroll.php.
 */
export function calculateCune(doc: XmlDocument, pin: string): string {
  const numero = getElementAttribute(doc, 'NumeroSecuenciaXML', 'Numero');
  const fechaGen = getElementAttribute(doc, 'InformacionGeneral', 'FechaGen');
  const horaGen = getElementAttribute(doc, 'InformacionGeneral', 'HoraGen');
  const devengados = truncateDecimals(parseFloat(getTagText(doc, 'DevengadosTotal')), 2);
  const deducciones = truncateDecimals(parseFloat(getTagText(doc, 'DeduccionesTotal')), 2);
  const comprobante = truncateDecimals(parseFloat(getTagText(doc, 'ComprobanteTotal')), 2);
  const nit = getElementAttribute(doc, 'Empleador', 'NIT');
  const numDoc = getElementAttribute(doc, 'Trabajador', 'NumeroDocumento', '0');
  const tipoXML = getElementAttribute(doc, 'InformacionGeneral', 'TipoXML');
  const ambiente = getElementAttribute(doc, 'InformacionGeneral', 'Ambiente');

  const hashString = `${numero}${fechaGen}${horaGen}${devengados}${deducciones}${comprobante}${nit}${numDoc}${tipoXML}${pin}${ambiente}`;
  return createHash('sha384').update(hashString).digest('hex');
}

/**
 * Calcula e inyecta el CUNE en `<InformacionGeneral CUNE="...">` y actualiza `<CodigoQR>`.
 *
 * Réplica de `setCUNE()` de SignPayroll.php.
 *
 * @returns El CUNE calculado.
 */
export function injectCune(doc: XmlDocument, pin: string): string {
  const cune = calculateCune(doc, pin);

  const infoGeneral = doc.getElementsByTagName('InformacionGeneral').item(0);
  if (infoGeneral) {
    (infoGeneral as any).setAttribute('CUNE', cune);
  }

  const ambiente = getElementAttribute(doc, 'InformacionGeneral', 'Ambiente');
  const qrDomain = ambiente === '2' ? QR_DOMAIN_HABILITACION : QR_DOMAIN_PRODUCCION;
  const qrElement = doc.getElementsByTagName('CodigoQR').item(0);
  if (qrElement) {
    qrElement.textContent = `https://${qrDomain}/document/searchqr?documentkey=${cune}`;
  }

  return cune;
}

/**
 * Calcula e inyecta el SoftwareSecurityCode para nómina en `<ProveedorXML SoftwareSC="...">`.
 * Fórmula: SHA384(softwareID + pin + NumeroSecuenciaXML/@Numero)
 *
 * Diferencia con facturas: usa atributo `SoftwareSC` en `<ProveedorXML>`,
 * mientras facturas usa nodo de texto `<sts:SoftwareSecurityCode>`.
 *
 * Réplica de `softwareSecurityCode()` de SignPayroll.php.
 *
 * @returns El código de seguridad calculado.
 */
export function injectPayrollSoftwareSecurityCode(doc: XmlDocument, softwareID: string, pin: string): string {
  const numero = getElementAttribute(doc, 'NumeroSecuenciaXML', 'Numero');
  const securityCode = softwareSecurityCode(softwareID, pin, numero);

  const proveedorXML = doc.getElementsByTagName('ProveedorXML').item(0);
  if (proveedorXML) {
    (proveedorXML as any).setAttribute('SoftwareSC', securityCode);
  }

  return securityCode;
}

// ---------------------------------------------------------------------------
// Funciones públicas — CUDE-EVENT (ApplicationResponse / Eventos)
// ---------------------------------------------------------------------------

/**
 * Calcula el CUDE para eventos (ApplicationResponse).
 * Fórmula: SHA384(ID + Date + Time + SenderNIT + ReceiverNIT +
 *          ResponseCode + DocRefID + DocTypeCode + pin)
 *
 * A diferencia del CUDE de facturas, NO incluye ProfileExecutionID.
 * Usa SenderParty/ReceiverParty en vez de AccountingSupplierParty/AccountingCustomerParty.
 *
 * Réplica de `cudeevent()` (buildEventHashString) de SignInvoice.php.
 */
export function calculateCudeEvent(doc: XmlDocument, pin: string): string {
  const id = getTagText(doc, 'cbc:ID', 0);
  const date = getTagText(doc, 'cbc:IssueDate', 0);
  const time = getTagText(doc, 'cbc:IssueTime', 0);

  // SenderParty/PartyTaxScheme/CompanyID
  const senderParty = doc.getElementsByTagName('cac:SenderParty').item(0);
  const senderNit = senderParty
    ? (senderParty as any).getElementsByTagName('cbc:CompanyID').item(0)?.textContent?.trim() || ''
    : '';

  // ReceiverParty/PartyTaxScheme/CompanyID
  const receiverParty = doc.getElementsByTagName('cac:ReceiverParty').item(0);
  const receiverNit = receiverParty
    ? (receiverParty as any).getElementsByTagName('cbc:CompanyID').item(0)?.textContent?.trim() || ''
    : '';

  // cac:DocumentResponse/cac:Response/cbc:ResponseCode
  const responseCode = getTagText(doc, 'cbc:ResponseCode', 0);

  // cac:DocumentResponse/cac:DocumentReference/cbc:ID
  const docResponse = doc.getElementsByTagName('cac:DocumentResponse').item(0);
  const docRef = docResponse
    ? (docResponse as any).getElementsByTagName('cac:DocumentReference').item(0)
    : null;
  const docRefId = docRef
    ? (docRef as any).getElementsByTagName('cbc:ID').item(0)?.textContent?.trim() || ''
    : '';
  const docTypeCode = docRef
    ? (docRef as any).getElementsByTagName('cbc:DocumentTypeCode').item(0)?.textContent?.trim() || ''
    : '';

  const hashString = `${id}${date}${time}${senderNit}${receiverNit}${responseCode}${docRefId}${docTypeCode}${pin}`;
  return createHash('sha384').update(hashString).digest('hex');
}

/**
 * Calcula e inyecta el CUDE para eventos:
 * - Escribe el CUDE en `<cbc:UUID>`.
 * - Actualiza `<QRCode>` reemplazando `-----CUFECUDE-----` con el UUID del documento de referencia.
 *
 * Réplica de `setUUID()` + `cudeevent()` de SignInvoice.php para ApplicationResponse.
 *
 * @returns El CUDE calculado.
 */
export function injectCudeEvent(doc: XmlDocument, pin: string): string {
  const cude = calculateCudeEvent(doc, pin);

  const uuidElement = doc.getElementsByTagName('cbc:UUID').item(0);
  if (uuidElement) {
    uuidElement.textContent = cude;
  }

  // El QR del evento usa el UUID del documento de referencia, no el CUDE del evento.
  // En el PHP: ConsultarCUFEEVENT() lee cac:DocumentReference/cbc:UUID
  const docResponse = doc.getElementsByTagName('cac:DocumentResponse').item(0);
  const docRefUuid = docResponse
    ? (docResponse as any).getElementsByTagName('cbc:UUID').item(0)?.textContent?.trim() || ''
    : '';

  const profileId = getTagTextOptional(doc, 'cbc:ProfileExecutionID', '1');
  const qrDomain = profileId === '2' ? QR_DOMAIN_HABILITACION : QR_DOMAIN_PRODUCCION;

  const qrElement = doc.getElementsByTagName('sts:QRCode').item(0)
    || doc.getElementsByTagName('cbc:QRCode').item(0);
  if (qrElement && qrElement.textContent) {
    qrElement.textContent = qrElement.textContent.replace(
      '-----CUFECUDE-----',
      docRefUuid,
    );
  }
  // Si QR no tiene placeholder, escribir URL estándar con el UUID de referencia
  if (qrElement && qrElement.textContent && !qrElement.textContent.includes('searchqr')) {
    qrElement.textContent = `https://${qrDomain}/document/searchqr?documentkey=${docRefUuid}`;
  }

  return cude;
}

// ---------------------------------------------------------------------------
// Funciones públicas — QR Code Data
// ---------------------------------------------------------------------------

/**
 * Genera la cadena de datos QR para facturas/notas crédito/débito.
 * Formato DIAN:
 * ```
 * NumFac: {ID}
 * FecFac: {IssueDate}
 * HorFac: {IssueTime}
 * NitFac: {SupplierNIT}
 * DocAdq: {CustomerNIT}
 * ValFac: {LineExtensionAmount}
 * ValIva: {TaxAmount01}
 * ValOtroIm: {SumaOtrosImpuestos}
 * ValTolFac: {PayableAmount}
 * CUFE: {UUID}
 * {QRCodeURL}
 * ```
 *
 * Réplica de `getQRData()` de SignInvoice.php.
 */
export function getQRDataInvoice(doc: XmlDocument, groupOfTotals: string = 'LegalMonetaryTotal'): string {
  const basic = getBasicDocumentData(doc);
  const parties = getPartyIdentifications(doc);
  const lineExtension = getLineExtensionAmount(doc, groupOfTotals);
  const payableAmount = getPayableAmount(doc, groupOfTotals);
  const taxIva = getTaxAmount(doc, '01');

  // Sumar otros impuestos
  let otherTaxSum = 0;
  for (const code of OTHER_TAX_CODES) {
    const amount = getTaxAmount(doc, code);
    otherTaxSum += parseFloat(amount);
  }
  const valOtroIm = truncateDecimals(otherTaxSum, 2);

  const uuid = getTagTextOptional(doc, 'cbc:UUID');
  const qrCode = getTagTextOptional(doc, 'sts:QRCode')
    || getTagTextOptional(doc, 'cbc:QRCode');

  return [
    `NumFac: ${basic.id}`,
    `FecFac: ${basic.date}`,
    `HorFac: ${basic.time}`,
    `NitFac: ${parties.supplier}`,
    `DocAdq: ${parties.customer}`,
    `ValFac: ${lineExtension}`,
    `ValIva: ${taxIva}`,
    `ValOtroIm: ${valOtroIm}`,
    `ValTolFac: ${payableAmount}`,
    `CUFE: ${uuid}`,
    qrCode,
  ].join('\n');
}

/**
 * Genera la cadena de datos QR para nómina electrónica.
 * Formato DIAN:
 * ```
 * NumNIE: {NumeroSecuenciaXML/@Numero}
 * FecNIE: {InformacionGeneral/@FechaGen}
 * HorNIE: {InformacionGeneral/@HoraGen}
 * TipoNota: {TipoNota}        ← solo si existe
 * NitNIE: {Empleador/@NIT}
 * DocEmp: {Trabajador/@NumeroDocumento}
 * ValDev: {DevengadosTotal}
 * ValDed: {DeduccionesTotal}
 * ValTol: {ComprobanteTotal}
 * CUNE: {InformacionGeneral/@CUNE}
 * {CodigoQR}
 * ```
 *
 * Réplica de `getQRData()` de SignPayroll.php.
 */
export function getQRDataPayroll(doc: XmlDocument): string {
  const numero = getElementAttribute(doc, 'NumeroSecuenciaXML', 'Numero');
  const fechaGen = getElementAttribute(doc, 'InformacionGeneral', 'FechaGen');
  const horaGen = getElementAttribute(doc, 'InformacionGeneral', 'HoraGen');
  const nit = getElementAttribute(doc, 'Empleador', 'NIT');
  const numDoc = getElementAttribute(doc, 'Trabajador', 'NumeroDocumento', '0');
  const devengados = truncateDecimals(parseFloat(getTagText(doc, 'DevengadosTotal')), 2);
  const deducciones = truncateDecimals(parseFloat(getTagText(doc, 'DeduccionesTotal')), 2);
  const comprobante = truncateDecimals(parseFloat(getTagText(doc, 'ComprobanteTotal')), 2);
  const cune = getElementAttribute(doc, 'InformacionGeneral', 'CUNE', '');
  const codigoQR = getTagTextOptional(doc, 'CodigoQR');

  // TipoNota es condicional — solo se incluye si existe en el XML
  const tipoNotaElement = doc.getElementsByTagName('TipoNota').item(0);
  const tipoNota = tipoNotaElement?.textContent?.trim() || '';

  const lines = [
    `NumNIE: ${numero}`,
    `FecNIE: ${fechaGen}`,
    `HorNIE: ${horaGen}`,
  ];

  if (tipoNota) {
    lines.push(`TipoNota: ${tipoNota}`);
  }

  lines.push(
    `NitNIE: ${nit}`,
    `DocEmp: ${numDoc}`,
    `ValDev: ${devengados}`,
    `ValDed: ${deducciones}`,
    `ValTol: ${comprobante}`,
    `CUNE: ${cune}`,
    codigoQR,
  );

  return lines.join('\n');
}
