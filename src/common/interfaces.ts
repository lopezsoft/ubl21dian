
/**
 * Define el contrato para una clase que firma un documento.
 * Esto permite desacoplar la lógica de negocio de la implementación
 * específica de la firma (por ejemplo, XAdES, CAdES, etc.).
 */
export interface ISigner {
	/**
	 * Firma el contenido de un documento XML.
	 * @param unsignedSoap El XML del sobre SOAP sin firmar.
	 * @param certificateData Los datos del certificado que se utilizará para la firma.
	 * @param action El valor del encabezado SOAP Action.
	 * @param toValue El valor del encabezado SOAP To.
	 * @returns Una promesa que se resuelve con el documento XML firmado como una cadena de texto.
	 */
	sign(unsignedSoap: string | any, certificateData: ICertificateData, action: string, toValue: string): string;
}

/**
 * Define el contrato para un cliente HTTP.
 * Esto nos permite desacoplar la lógica de la librería de una
 * implementación específica como axios o fetch.
 */
/**
 * Define el contrato para un cliente HTTP.
 */
export interface IHttpClient {
	/**
	 * Realiza una petición POST. La URL de destino es conocida por la
	 * implementación del cliente.
	 * @param data El cuerpo de la petición.
	 * @param headers Los encabezados de la petición.
	 * @returns Una promesa que se resuelve con la respuesta de la petición.
	 */
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
	/**
	 * Genera el cuerpo del mensaje SOAP.
	 * @param params Los parámetros para construir la plantilla.
	 * @returns El XML del sobre SOAP sin firmar.
	 */
	getXml(params: ITemplateParams): string;
}

// Opciones de configuración para el cliente.
export interface IDianClientOptions {
	passwordPsswrd?: string;
	environment: number; // 2 para HABILITACION, 1 para PRODUCCION
}




export interface ISendBillSyncParams extends ITemplateParams {
	fileName: string;
	contentFile: string; // Este será el XML de la factura, firmado y en Base64
}

export interface ISendBillAsyncParams extends ITemplateParams {
	fileName: string;
	contentFile: string; // XML de la factura, firmado y en Base64
}


export interface IGetNumberingRangeParams extends ITemplateParams {
	accountCode: string;  // NIT del facturador electrónico
	accountCodeT: string; // NIT del proveedor tecnológico
	softwareCode: string; // ID del software
}


export interface ISendEventParams extends ITemplateParams {
	contentFile: string; // XML del evento (ApplicationResponse), firmado y en Base64
}



export interface ISendTestSetAsyncParams extends ITemplateParams {
	fileName: string;
	contentFile: string; // ZIP en Base64
	testSetId: string;
}

export interface IGetStatusZipParams extends ITemplateParams {
	trackId: string;
}

export interface ISendNominaSyncParams extends ITemplateParams {
	contentFile: string; // XML de la nómina, firmado y en Base64
}


export interface ISendBillAttachmentAsyncParams extends ITemplateParams {
	fileName: string;
	contentFile: string; // XML del AttachedDocument, firmado y en Base64
}

/**
 * Define los servicios que un comando podría necesitar para ejecutarse.
 * Se pasarán desde el DianClient a cada comando.
 */
export interface ICommandServices {
	soapClient: IHttpClient;
	soapSigner: ISigner;
	xmlSigner: ISigner;
	payrollSigner: ISigner;
	certificateData: ICertificateData; // ICertificateData
	environment: number; // 1 para PRODUCCIÓN, 2 para HABILITACIÓN
}

/**
 * Define el contrato para un Comando. Cada comando encapsula una única
 * operación del web service de la DIAN.
 */
export interface ICommand<TParams, TResult> {
	/**
	 * Ejecuta la operación del comando.
	 * @param services Un objeto con los servicios necesarios (firmantes, cliente http).
	 * @param params Los parámetros específicos para esta operación.
	 * @returns Una promesa que se resuelve con el resultado de la operación.
	 */
	execute(services: ICommandServices, params: TParams): Promise<TResult>;
}

export interface IGetStatusCommandParams {
	trackId: string;
}

export interface IGetXmlByDocumentKeyParams extends ITemplateParams {
	trackId: string;
}

export interface IGetXmlByDocumentKeyParams {
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
export interface ISendNominaSyncParams {
	unsignedPayrollXml: string;
}

export interface IGetStatusZipParams {
	trackId: string;
}

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

/**
 * Representa la información extraída de un certificado digital PKCS#12.
 */
export interface ICertificateData {
	/**
	 * La clave privada en formato PEM.
	 */
	privateKeyPem: string;
	/**
	 * La clave pública y la cadena de certificados en formato PEM.
	 */
	publicKeyPem: string;
	/**
	 * El certificado principal en formato Base64, sin cabeceras ni saltos de línea.
	 * Este formato es el requerido para el tag <ds:X509Certificate>.
	 */
	x509CertificateBase64: string;
}

export interface IDianClientInitializeOptions {
	certificate: Buffer; // Espera el contenido del certificado como un Buffer
	passwordPsswrd: string;
}