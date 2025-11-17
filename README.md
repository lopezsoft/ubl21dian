# UBL 2.1 DIAN

Core for electronic invoicing pre-validation - DIAN UBL 2.1.

## Latest Release

### Version 3.6.0 (2025-11-17)

**⚠️ BREAKING FIX**: Esta versión corrige el cálculo de CUFE/CUDE para cumplir con la especificación de la DIAN (2 decimales exactos).

#### Changed
- **Formateo correcto de valores monetarios**: Todos los valores monetarios y de impuestos ahora se formatean con exactamente 2 decimales en el cálculo de CUFE/CUDE
  - `LineExtensionAmount` y `PayableAmount` formateados a 2 decimales
  - Todos los impuestos (`TaxAmount`) formateados a 2 decimales
  - Previene errores cuando los XML contienen valores con hasta 6 decimales

#### Added
- Métodos auxiliares privados para mejorar mantenibilidad y reutilización de código
- Mejor arquitectura interna siguiendo principios SOLID y DRY

#### Improved
- Refactorización completa de generación de CUFE/CUDE
- Código más limpio, testeable y mantenible
- Eliminación de duplicación de código

**Nota**: Si anteriormente usaba valores con más de 2 decimales, el CUFE/CUDE generado será diferente (ahora correcto según especificación DIAN).

---

# Tags
* **3.6.0**: Fix crítico - Formateo correcto a 2 decimales para CUFE/CUDE. Refactorización de código.
* **3.5.1**: Ajustes en la nómina de ajustes de eliminación.
* **3.5.0**: Calcular y setear SoftwareSecurityCode, CUNE, URL de consulta CUNE en CodigoQR, función para obtener información del QR.
* **3.4.0**: GetAcquirer para obtener datos de entidad adquirente (Resolución 000202 de 2025).
* **3.2.11**: FIX - Formato dateTime en XML para SigningTime. Feature - Mejora descripción errores DIAN.
* **3.2.6**: Ajustes en SignInvoice para generar acuse de recibo.
* **3.2.3**: Ajustes en SignInvoice para obtener CUFE y QR.
* **3.2.0**: Control de errores en las solicitudes.
* **3.1.9**: Ajustes en la firma de eventos.
* **3.1.5-3.1.8**: Eventos para envío de facturas, notas crédito y débito.
* **2.0**: Notas débito y estándar de nombres de documentos.
* **1.3**: Licencia LGPL.
* **1.2**: Notas crédito y cálculo del CUDE.
* **1.1.1**: Solución error canonización.
* **1.1**: Templates para Web Service, require curl.
* **1.0**: Tests válidos con binary security token (SOAP) y firma XAdES (XML) con sha1, sha256, sha512.

# Resources
* [Documentation](https://docs.matias-api.com)
* [CHANGELOG](CHANGELOG.md)

## Installation

```bash
composer require lopezsoft/ubl21dian
```

## Requirements

- PHP >= 8.0
- Extensions: dom, xml, curl, libxml, openssl, xmlwriter, json
- nesbot/carbon ^2.19 || ^3.8

## Authors

* [Lewis Lopez](https://github.com/lopezsoft/)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- Issues: https://github.com/lopezsoft/ubl21dian/issues
- Source: https://github.com/lopezsoft/ubl21dian

