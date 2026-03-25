export const ADDRESSING = 'http://www.w3.org/2005/08/addressing';
export const SOAP_ENVELOPE = 'http://www.w3.org/2003/05/soap-envelope';
export const DIAN_COLOMBIA = 'http://wcf.dian.colombia';
export const XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#';
export const WSS_WSSECURITY = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';
export const WSS_WSSECURITY_UTILITY = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd';
export const EXC_C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#';
export const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
export const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256';
export const X509V3 = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3';
export const BASE64BINARY = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary';
export const XML_VERSION = '1.0';
export const XML_ENCODING = 'UTF-8';

export const GET_ACQUIRER_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetAcquirer';
export const GET_EXCHANGE_EMAILS_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetExchangeEmails';
export const GET_NUMBERING_RANGE_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetNumberingRange';
export const GET_REFERENCE_NOTES_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetReferenceNotes';
export const GET_STATUS_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatus';
export const GET_STATUS_ZIP_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusZip';
export const GET_XML_BY_DOCUMENT_KEY_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetXmlByDocumentKey';

export const SEND_BILL_SYNC_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync';
export const SEND_BILL_ASYNC_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillAsync';
export const SEND_BILL_ATTACHMENT_ASYNC_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillAttachmentAsync';
export const SEND_EVENT_UPDATE_STATUS_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendEventUpdateStatus';
export const SEND_NOMINA_SYNC_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendNominaSync';
export const SEND_TEST_SET_ASYNC_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendTestSetAsync';
export const GET_STATUS_EVENT_ACTION = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusEvent';

// XAdES — Constantes de firma (réplica de SignInvoice.php)
export const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
export const ENVELOPED_SIGNATURE = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
export const SIGNED_PROPERTIES_TYPE = 'http://uri.etsi.org/01903#SignedProperties';
export const POLITICA_FIRMA_V2 = 'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf';
export const POLITICA_FIRMA_V2_VALUE = 'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=';
export const XADES_NS = 'http://uri.etsi.org/01903/v1.3.2#';
export const XADES141_NS = 'http://uri.etsi.org/01903/v1.4.1#';

// DIAN — Dominios QR por ambiente
export const QR_DOMAIN_HABILITACION = 'catalogo-vpfe-hab.dian.gov.co';
export const QR_DOMAIN_PRODUCCION = 'catalogo-vpfe.dian.gov.co';