import { XMLParser } from 'fast-xml-parser';
import type { Document as XmlDocument } from '@xmldom/xmldom';

export const fastXmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	removeNSPrefix: true, // Simplifica el objeto resultante
});

export function removeDomChild(document: XmlDocument, tagName: string, item: number = 0) {
	const tag = document.documentElement!.getElementsByTagName(tagName).item(item);
	if (tag) {
		document.documentElement!.removeChild(tag);
	}
	return document;
}

export function getDomTag(domDocument: XmlDocument, tagName: string, item: number = 0, validate: boolean = true) {
	const tagList = domDocument.documentElement!.getElementsByTagName(tagName);
	const tag = tagList.item(item);

	if (validate && !tag) {
		throw new Error(`The tag name ${tagName} does not exist.`);
	}
	return tag;
}

export function getDomQuery(domXPath: any, query: string, validate: boolean = true, item: number = 0) {
	if (validate && !domXPath.query(query).item(0)) {
		throw new Error(`The query ${query} does not exist.`);
	}
	return item !== null ? domXPath.query(query).item(item) : domXPath.query(query);
}

export function joinArray(array: Record<string, any>, formatNS: boolean = true, join: string = ' '): string {
	return Object.entries(array)
		.map(([key, value]) => formatNS ? `${key}="${value}"` : `${key}=${value.toUpperCase()}`)
		.join(join);
}

export function x509Export(certificate: string): string {
	if (!certificate) {
		throw new Error('Error: El certificado no está definido.');
	}

	const cleanCert = certificate.replace(/(-{5}(BEGIN|END) CERTIFICATE-{5}|\s)/g, '');

	// Divide la cadena en fragmentos de 64 caracteres y únelos con un salto de línea
	return '\n' + cleanCert.match(/.{1,64}/g)?.join('\n') + '\n\n' || '';
}