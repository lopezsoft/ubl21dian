<?php

namespace Lopezsoft\UBL21dian\Templates\SOAP;

use Lopezsoft\UBL21dian\Templates\Template;
use Lopezsoft\UBL21dian\Templates\CreateTemplate;

/**
 * Send bill async.
 */
class SendBillAsync extends Template implements CreateTemplate
{
    /**
     * Action.
     *
     * @var string
     */
    public $Action = 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillAsync';

    /**
     * Required properties.
     *
     * @var array
     */
    protected $requiredProperties = [
        'fileName',
        'contentFile',
    ];

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
    <soap:Body>
        <wcf:SendBillAsync>
            <!--Optional:-->
            <wcf:fileName>{$this->fileName}</wcf:fileName>
            <!--Optional:-->
            <wcf:contentFile>{$this->contentFile}</wcf:contentFile>
        </wcf:SendBillAsync>
    </soap:Body>
</soap:Envelope>
XML;
    }
}
