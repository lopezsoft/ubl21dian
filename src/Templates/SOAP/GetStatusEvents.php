<?php

namespace Lopezsoft\UBL21dian\Templates\SOAP;

use Lopezsoft\UBL21dian\Templates\Template;
use Lopezsoft\UBL21dian\Templates\CreateTemplate;

/**
 * Get status.
 */
class GetStatusEvents extends Template implements CreateTemplate
{
    /**
     * Action.
     *
     * @var string
     */
    public $Action = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusEvent';

    /**
     * Required properties.
     *
     * @var array
     */
    protected $requiredProperties = [
        'trackId',
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
        <wcf:GetStatusEvent>
            <!--Optional:-->
            <wcf:trackId>{$this->trackId}</wcf:trackId>
        </wcf:GetStatusEvent>
    </soap:Body>
</soap:Envelope>
XML;
    }
}
