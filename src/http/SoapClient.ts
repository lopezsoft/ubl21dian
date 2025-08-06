import axios, { AxiosInstance, AxiosError } from 'axios';
import { IHttpClient } from '../common/interfaces';
import { DianEndpoints } from '../config/dianEndpoints';
import * as fs from "node:fs";

/**
 * Cliente para la comunicación con los servicios web SOAP de la DIAN.
 * Implementa la interfaz IHttpClient para desacoplar la lógica de la
 * librería de peticiones HTTP subyacente (axios).
 */
export class SoapClient implements IHttpClient {
	private readonly client: AxiosInstance;
	private readonly environment: number;

	constructor(environment: number = 1) {
		this.environment = environment;
		this.client = axios.create({
			timeout: 30000, // 30 segundos de timeout
			headers: {
				'Content-Type': 'application/soap+xml; charset=utf-8',
				'Accept': 'application/xml',
				'Connection': 'keep-alive',
			},
		});
	}

	/**
	 * Realiza una petición POST al endpoint de la DIAN.
	 * @param _ La URL no se usa directamente, se obtiene del entorno.
	 * @param data El cuerpo del mensaje SOAP.
	 * @param headers Los encabezados adicionales para la petición.
	 * @returns Una promesa que se resuelve con la respuesta del servicio.
	 */
	public async post(data: string, headers: { [key: string]: string }): Promise<any> {
		const url = DianEndpoints[this.environment];
		try {
			let xmlSinEspacios = data.replace(/[\n\t\r]/g, '');
			xmlSinEspacios = xmlSinEspacios.replace(/>\s+</g, '><').trim();
			// fs.writeFileSync('request.xml', xmlSinEspacios, 'utf8'); // Guardar el XML para depuración
			headers['Content-Length'] = Buffer.byteLength(xmlSinEspacios).toString();
			// Realiza la petición POST usando axios
			const response = await this.client.post(url, xmlSinEspacios, { headers });
			return response.data;
		} catch (error) {
			console.error('Error en la petición SOAP:', error);
			console.error('--------------------------------------------------');
			// Si el error es de tipo AxiosError, maneja el error HTTP
			this.handleHttpError(error as AxiosError);
		}
	}

	/**
	 * Maneja los errores de la petición HTTP, proporcionando mensajes
	 * claros basados en el código de estado, similar a `Client.php`.
	 * @param error El error capturado por axios.
	 */
	private handleHttpError(error: AxiosError): void {
		if (error.code === 'ECONNABORTED') {
			throw new Error('Error 504: Gateway Timeout. La conexión con la DIAN está tardando más de lo esperado. Por favor, ' +
				'intente nuevamente. Si el problema persiste, contacte a soporte técnico.');
		}

		const status = error.response?.status;
		const responseDataString = error.response?.data ? JSON.stringify(error.response.data) : error.message;

		let errorMessage = `Error HTTP ${status || 'desconocido'}: Ha ocurrido un error en la solicitud a la DIAN.`;
		const additionalMessage = ' Por favor, intente de nuevo en un par de minutos.';

		switch (status) {
			case 500:
				errorMessage = `Error 500: Internal Server Error. Problema en el servidor de la DIAN. Detalles: ${responseDataString}`;
				break;
			case 503:
				errorMessage = `Error 503: Service Unavailable. El servicio de la DIAN no está disponible.`;
				break;
			case 507:
				errorMessage = `Error 507: Insufficient Storage. El servidor de la DIAN no tiene suficiente espacio.`;
				break;
			case 508:
				errorMessage = `Error 508: Loop Detected. Se ha detectado un bucle en el servidor de la DIAN.`;
				break;
			case 504:
				errorMessage = `Error 504: Gateway Timeout. La conexión con la DIAN está tardando más de lo esperado. Por favor, 
				intente nuevamente. Si el problema persiste, contacte a soporte técnico.`;
				break;
			case 403:
				errorMessage = `Error 403: Forbidden. El sitio de la DIAN podría estar deshabilitado.`;
				break;
		}

		throw new Error(`${errorMessage}${additionalMessage}. Detalles técnicos: ${responseDataString}`);
	}
}