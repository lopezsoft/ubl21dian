<?php

namespace Lopezsoft\UBL21dian\Templates\SOAP;

use Lopezsoft\UBL21dian\Templates\CreateTemplate;
use Lopezsoft\UBL21dian\Templates\Template;

/**
 * Get status.
 */
class GetAcquirer extends Template implements CreateTemplate
{
    /**
     * Action.
     *
     * @var string
     */
    public $Action = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetAcquirer';

    /**
     * Required properties.
     *
     * @var array
     */
    protected array $requiredProperties = [
        'identificationType',
        'identificationNumber',
    ];
    /**
     * Identification type
     * 13: Cédula de ciudadanía
     * 31: NIT
     * 41: Pasaporte
     * 47: PEP (Permiso Especial de Permanencia)
     * 48: PPT (Permiso Protección Temporal)
     * @var void
     */
    public $identificationType;
    /**
     * Identification number
     * @var void
     */
    public $identificationNumber;

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
        <wcf:GetAcquirer>
             <!--Optional:-->
             <wcf:identificationType>{$this->identificationType}</wcf:identificationType>
             <!--Optional:-->
             <wcf:identificationNumber>{$this->identificationNumber}</wcf:identificationNumber>
        </wcf:GetAcquirer>
    </soap:Body>
</soap:Envelope>
XML;
    }
}
