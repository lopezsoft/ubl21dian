<?php

namespace Lopezsoft\UBL21dian\Templates\SOAP;

use Lopezsoft\UBL21dian\Templates\CreateTemplate;
use Lopezsoft\UBL21dian\Templates\Template;

/**
 * Get Exchange Emails.
 * Función: Consultar el correo electrónico suministrado por el adquiriente registrado en el procedimiento de habilitación como facturador electrónico.
 * Proceso: Sincrónico
 * Método: GetExchangeEmails
 */
class GetExchangeEmails extends Template implements CreateTemplate
{
    /**
     * Action.
     *
     * @var string
     */
    public $Action = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetExchangeEmails';


    /**
     * Construct.
     *
     * @param string $pathCertificate
     * @param string $passwords
     */
    public function __construct($pathCertificate, $passwords)
    {
        parent::__construct($pathCertificate, $passwords);
    }

    /**
     * Create template.
     *
     * @return string
     */
    public function createTemplate()
    {
        return $this->templateXMLSOAP = <<<XML
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wcf="http://wcf.dian.colombia">
    <soap:Header/>
    <soap:Body>
        <wcf:GetExchangeEmails/>
    </soap:Body>
</soap:Envelope>
XML;
    }
}
