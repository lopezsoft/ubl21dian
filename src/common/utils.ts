import { XMLParser } from 'fast-xml-parser';

export const fastXmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	removeNSPrefix: true, // Simplifica el objeto resultante
});