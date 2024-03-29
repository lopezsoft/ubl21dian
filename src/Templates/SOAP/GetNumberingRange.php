<?php

namespace Lopezsoft\UBL21dian\Templates\SOAP;

use Lopezsoft\UBL21dian\Templates\CreateTemplate;
use Lopezsoft\UBL21dian\Templates\Template;

/**
 * Get Numering Range.
 * Función: Consulta de Rangos de Numeración registado en DIAN entregando la información relacionada con estos rangos.
 * Proceso: Sincrónico
 * Método: GetNumberingRange
 * Se requiere como parámetro el NIT de la empresa, NIT Proveedor Tecnologico, IdentificadorSoftware
 */
class GetNumberingRange extends Template implements CreateTemplate
{
    /**
     * Action.
     *
     * @var string
     */
    public $Action = 'http://wcf.dian.colombia/IWcfDianCustomerServices/GetNumberingRange';

    /**
     * Required properties.
     *
     * @var array
     */
    protected $requiredProperties = [
        'accountCode',
        'accountCodeT',
        'softwareCode',
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
   <soap:Header/>
   <soap:Body>
      <wcf:GetNumberingRange>
         <!--Optional:-->
         <wcf:accountCode>{$this->accountCode}</wcf:accountCode>
         <!--Optional:-->
         <wcf:accountCodeT>{$this->accountCodeT}</wcf:accountCodeT>
         <!--Optional:-->
         <wcf:softwareCode>{$this->softwareCode}</wcf:softwareCode>
      </wcf:GetNumberingRange>
   </soap:Body>
</soap:Envelope>
XML;
    }
}

