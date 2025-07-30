import {ISoapTemplate, ITemplateParams} from "../../common/interfaces";

/**
 * Clase base abstracta para las plantillas SOAP.
 */
export abstract class BaseTemplate implements ISoapTemplate {
	public abstract getXml(params: ITemplateParams): string;
}