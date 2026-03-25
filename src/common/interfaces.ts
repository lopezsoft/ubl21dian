/**
 * Define el contrato para una clase que firma un documento.
 */
export interface ISigner {
	sign(unsignedSoap: string | any, certificateData: ICertificateData, action: string, toValue: string): string;
}

/**
 * Define el contrato para un cliente HTTP.
 */
export interface IHttpClient {
	post(data: any, headers: { [key: string]: string }): Promise<any>;
}

/**
 * Parámetros comunes para todas las plantillas.
 */
export interface ITemplateParams {
	[key: string]: any;
}

/**
 * Contrato para todas las plantillas de mensajes SOAP.
 */
export interface ISoapTemplate {
	getXml(params: ITemplateParams): string;
}

/**
 * Opciones de configuración para el cliente DIAN.
 */
export interface IDianClientOptions {
	environment: number; // 1 para PRODUCCION, 2 para HABILITACION
}

/**
 * Define los servicios que un comando necesita para ejecutarse.
 */
export interface ICommandServices {
	soapClient: IHttpClient;
	soapSigner: ISigner;
	xmlSigner: ISigner;
	payrollSigner: ISigner;
	certificateData: ICertificateData;
	environment: number;
}

/**
 * Define el contrato para un Comando.
 */
export interface ICommand<TParams, TResult> {
	execute(services: ICommandServices, params: TParams): Promise<TResult>;
}

/**
 * Representa la información extraída de un certificado digital PKCS#12.
 */
export interface ICertificateData {
	privateKeyPem: string;
	publicKeyPem: string;
	x509CertificateBase64: string;
}

export interface IDianClientInitializeOptions {
	certificate: Buffer;
	passwordPsswrd: string;
}

// --- Parámetros de Comandos ---

export interface ISendBillSyncParams {
	fileName: string;
	unsignedUblXml: string;
}

export interface ISendBillAsyncParams {
	fileName: string;
	unsignedUblXml: string;
}

export interface ISendEventParams {
	unsignedEventXml: string;
}

export interface ISendNominaSyncParams {
	unsignedPayrollXml: string;
}

export interface ISendTestSetAsyncParams extends ITemplateParams {
	fileName: string;
	contentFile: string;
	testSetId: string;
}

export interface ISendBillAttachmentAsyncParams {
	fileName: string;
	unsignedAttachedDocumentXml: string;
}

export interface IGetStatusCommandParams {
	trackId: string;
}

export interface IGetStatusZipParams {
	trackId: string;
}

export interface IGetStatusEventParams {
	trackId: string;
}

export interface IGetXmlByDocumentKeyParams {
	trackId: string;
}

export interface IGetReferenceNotesParams extends ITemplateParams {
	trackId: string;
}

export interface IGetAcquirerParams extends ITemplateParams {
	identificationType: string;
	identificationNumber: string;
}

export interface IGetNumberingRangeParams extends ITemplateParams {
	accountCode: string;
	accountCodeT: string;
	softwareCode: string;
}

export interface IGetExchangeEmailsParams {
	// No requiere parámetros
}

// --- Parámetros de Templates (uso interno) ---

export interface ISendBillSyncTemplateParams extends ITemplateParams {
	fileName: string;
	contentFile: string;
}

export interface ISendBillAsyncTemplateParams extends ITemplateParams {
	fileName: string;
	contentFile: string;
}

export interface ISendEventTemplateParams extends ITemplateParams {
	contentFile: string;
}

export interface ISendNominaSyncTemplateParams extends ITemplateParams {
	contentFile: string;
}

export interface ISendBillAttachmentAsyncTemplateParams extends ITemplateParams {
	fileName: string;
	contentFile: string;
}