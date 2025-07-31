import { BaseXmlSigner } from './BaseXmlSigner';

/**
 * Firmante especializado para documentos de Nómina Electrónica.
 * Sobreescribe los "hooks" para manejar la transformación de namespaces
 * requerida por la DIAN para este tipo de documento.
 */
export class PayrollSigner extends BaseXmlSigner {
	protected override preSigningTransform(xml: string): string {
		if (xml.includes('NominaIndividualDeAjuste')) {
			return xml.replace(
				'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"',
				'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"'
			);
		}
		return xml.replace(
			'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"',
			'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"'
		);
	}

	protected override postSigningTransform(xml: string): string {
		if (xml.includes('NominaIndividualDeAjuste')) {
			return xml.replace(
				'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"',
				'xmlns="dian:gov:co:facturaelectronica:NominaIndividualDeAjuste"'
			);
		}
		return xml.replace(
			'xmlns="urn:dian:gov:co:facturaelectronica:NominaIndividual"',
			'xmlns="dian:gov:co:facturaelectronica:NominaIndividual"'
		);
	}
}