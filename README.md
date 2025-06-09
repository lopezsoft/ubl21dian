# UBL 2.1 DIAN

Core for electronic invoicing pre-validation - DIAN UBL 2.1.

# Tags
* 1.0: Contains valid tests with binary security token (SOAP) and XAdES signature (XML) with algorithms sha1, sha256 and sha512.
* 1.1: Contains main templates for Web Service consumption, require curl as a dependency.
* 1.1.1: Canonization error is solved.
* 1.2: Contains valid proofs for the sending of credit notes and calculation of the CUDE.
* 1.3: License LGPL.
* 2.0: Contains valid proofs for the sending of debit notes and document name standard.
* 3.1.5: Events for the sending of invoices, credit notes and debit notes.
* 3.1.7: Events for the sending of invoices, credit notes and debit notes.
* 3.1.8: Events for the sending of invoices, credit notes and debit notes.
* 3.1.9: Ajustes en la firma de eventos.
* 3.2.0: Control de errores en las solicitudes.
* 3.2.3: Ajustes en SignInvoice, para que permita obtener el CUFE Y QR.
* 3.2.6: Ajustes en SignInvoice, para generar acuse de recibo.
* 3.2.11: FIX - Corregir formato dateTime en XML para SigningTime en facturas DIAN.
* * 3.2.11: Feature - Se mejora la descripción en los errores devueltos por la DIAN.
* 3.4.0: Feature - Se agrega GetAcquirer para obtener los datos de la entidad adquirente. De acuerdo a la resolution Resolución 000202 de 2025.
* 3.5.0: Feature - Calcular y setear el SoftwareSecurityCode
* 3.5.0: Feature - Calcular y setear CUNE
* 3.5.0: Feature - Agregar la url de consulta de CUNE en el campo CodigoQR
* 3.5.0: Feature - Funcion para obtener la informacion del QR
# Resources
* [Documentation](https://docs.matias-api.com)

## Authors

* [Lewis Lopez](https://github.com/lopezsoft/)
