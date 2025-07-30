import { ICertificateData } from '../security/Certificate';

/**
 * Define el contrato para una clase que firma un documento.
 * Esto permite desacoplar la lógica de negocio de la implementación
 * específica de la firma (por ejemplo, XAdES, CAdES, etc.).
 */
export interface ISigner {
	/**
	 * Firma el contenido de un documento XML.
	 * @param xml El contenido del documento XML a firmar, como una cadena de texto.
	 * @param certificateData Los datos del certificado que se utilizará para la firma.
	 * @returns Una promesa que se resuelve con el documento XML firmado como una cadena de texto.
	 */
	sign(xml: string, certificateData: ICertificateData): Promise<string>;
}

/**
 * Define el contrato para un cliente HTTP.
 * Esto nos permite desacoplar la lógica de la librería de una
 * implementación específica como axios o fetch.
 */
export interface IHttpClient {
	/**
	 * Realiza una petición POST a una URL.
	 * @param url La URL del endpoint.
	 * @param data El cuerpo de la petición.
	 * @param headers Los encabezados de la petición.
	 * @returns Una promesa que se resuelve con la respuesta de la petición.
	 */
	post(url: string, data: any, headers: { [key: string]: string }): Promise<any>;
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
	certificatePath: string;
	password: string;
	passwordPsswrd: string;
	environment?: 'HABILITACION' | 'PRODUCCION';
}
