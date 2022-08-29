<?php

namespace Stenfrank\UBL21dian\Templates\SOAP;

use Stenfrank\UBL21dian\Templates\Template;
use Stenfrank\UBL21dian\Templates\CreateTemplate;

/**
 * Send bill sync.
 */
class SendNominaSync extends Template implements CreateTemplate
{
    /**
     * Action.
     *
     * @var string
     */
    public $Action = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendNominaSync';

    /**
     * Required properties.
     *
     * @var array
     */
    protected $requiredProperties = [
        'contentFile',
    ];

    /**
     * Construct.
     *
     * @param string $pathCertificate
     * @param string $passwors
     */
    public function __construct($pathCertificate, $passwors)
    {
        parent::__construct($pathCertificate, $passwors);
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
    <soap:Body>
        <wcf:SendNominaSync>
            <!--Optional:-->
            <wcf:contentFile>{$this->contentFile}</wcf:contentFile>
        </wcf:SendNominaSync>
    </soap:Body>
</soap:Envelope>
XML;
    }
}
