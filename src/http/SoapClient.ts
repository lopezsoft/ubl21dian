import axios, { AxiosInstance, AxiosError } from 'axios';
import { IHttpClient } from '../common/interfaces';
import { DianEndpoints } from '../config/dianEndpoints';

/**
 * Cliente para la comunicación con los servicios web SOAP de la DIAN.
 * Implementa la interfaz IHttpClient para desacoplar la lógica de la
 * librería de peticiones HTTP subyacente (axios).
 */
export class SoapClient implements IHttpClient {
	private readonly client: AxiosInstance;
	private readonly environment: 'HABILITACION' | 'PRODUCCION';

	constructor(environment: 'HABILITACION' | 'PRODUCCION' = 'HABILITACION') {
		this.environment = environment;
		this.client = axios.create({
			timeout: 30000, // 30 segundos de timeout
			headers: {
				'Content-Type': 'application/soap+xml;charset=UTF-8',
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
	public async post(data: any, headers: { [key: string]: string }): Promise<any> {
		const url = DianEndpoints[this.environment];
		try {
			const response = await this.client.post(url, data, { headers });
			return response.data;
		} catch (error) {
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
			throw new Error('Error 504: Gateway Timeout. La conexión con la DIAN tardó demasiado.');
		}

		const status = error.response?.status;
		const responseData = error.response?.data;

		let errorMessage = `Error HTTP ${status || 'desconocido'}: Ha ocurrido un error en la solicitud a la DIAN.`;
		const additionalMessage = ' Por favor, intente de nuevo en un par de minutos.';

		switch (status) {
			case 500:
				errorMessage = `Error 500: Internal Server Error. Problema en el servidor de la DIAN. Detalles: ${responseData}`;
				break;
			case 503:
				errorMessage = `Error 503: Service Unavailable. El servicio de la DIAN no está disponible.`;
				break;
			case 403:
				errorMessage = `Error 403: Forbidden. El sitio de la DIAN podría estar deshabilitado.`;
				break;
		}

		throw new Error(errorMessage + additionalMessage);
	}
}